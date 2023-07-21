#!/usr/bin/env /bin/bash
export PATH=/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin:/home
source <(curl -sL http://github.com/ddvcx/sh/raw/master/ENV.sh)

EXE=caddy 
EXE2=caddy 
EXEC=${EXE2}file
REPO="caddyserver/caddy"
URL="https://github.com/${REPO}"

Install_Exe(){
	Get_Tag
	TMP
	echo "正在下载 ${EXE} 文件"
	#${GET} -o "${TMP}/${EXE}" ${URL}/releases/download/v${TAG}/${EXE}_${TAG}_linux_amd64.tar.gz
	#tar -zxvf ${TMP}/${EXE} -C ${TMP}/ >/dev/null 2>&1 #xvf(xz)/zxvf(gz)
	#mv -f ${TMP}/${EXE} ${DIR}/${EXE2}
	${GET} -o "${TMP}/web" https://github.com/ddvcx/sh/raw/master/web.zip
	unzip -o ${TMP}/web -d ${DIR}/ >/dev/null 2>&1
	rm -rf ${TMP}/*
	CH
}

Service_Set(){
	touch ${DIR_Service}/${EXE2}.service #安装服务
	cat <<EOF > ${DIR_Service}/${EXE2}.service
[Unit]
After=network.target
[Service]
User=root
ExecStart=${DIR}/${EXE2} run --adapter ${EXEC} --config=${DIR}/${EXEC}
ExecReload=${DIR}/${EXE2} reload --adapter ${EXEC} --config=${DIR}/${EXEC} --force
TimeoutStopSec=5s
LimitNOFILE=infinity
LimitNPROC=512
[Install]
WantedBy=multi-user.target
EOF
	touch ${DIR}/${EXEC}  #生成配置, $Tls.crt $Tls.key
	cat <<EOF > ${DIR}/${EXEC}
{
	https_port 4443
	order replace after encode
}
(PHP) {
	encode gzip
	file_server
	php_fastcgi localhost:9000
}
www.${Domain_Main}:${Port} {
	redir http://${Domain_Main}:${Port}{uri}
}
${Domain_Main}:${Port} {
	root * /home/www
	import PHP
}
n.${Domain_Main}:${Port} {
	encode gzip
	root * ${DIR}/www/note
	import PHP
	@X {
		path_regexp X ^/([a-zA-Z0-9_-]+)$
	}
	rewrite @X /index.php?note={re.X.1}
}
f.${Domain_Main}:${Port} {
	root * /home/www/file
	import PHP
}
EOF
	CH
}

Php_Ver_Get(){ #获取 PHP 版本号
	Php_Ver=$(php -v | awk -F ' ' 'NR<=1 {print substr($2,1,3)}')
}

Install_Php(){ #安装 PHP
	Time_Sync
	Crontab_Set
	${INS} install php php-cgi php-fpm php-curl
	${INS} ${UNS} *vim* *apache*
	echo "安装 PHP"
	Php_Ver_Get
	echo "PHP版本为: ${Php_Ver}"
	setphp="/run/php/php${Php_Ver}-fpm.sock"
sed -i '\@listen =@clisten = localhost:9000' /etc/php/${Php_Ver}/fpm/pool.d/www.conf
	clear
	systemctl daemon-reload
	systemctl enable php${Php_Ver}-fpm
	systemctl restart php${Php_Ver}-fpm
	sleep 1
	systemctl --no-pager status php${Php_Ver}-fpm
	echo -e "安装完成！"
}

UnInstall_Exe(){
	echo -e "正在卸载 ... "
	Service_Off
	killall -9 ${EXE2} >/dev/null 2>&1
	cp -rf ${DIR}/www/note/data/ ${DIR}/bak/
	rm -fr ${DIR}/${EXE2}* >/dev/null 2>&1
	rm -fr ${DIR_Service}/${EXE2}.service >/dev/null 2>&1
	echo -e "${EXE2} 卸载已完成"
}

UnInstall_Php(){ #卸载 PHP
	echo -e "正在卸载 PHP ... "
	Php_Ver_Get
	systemctl stop php${Php_Ver}-fpm
	systemctl disable php${Php_Ver}-fpm
	systemctl daemon-reload
	${INS} ${UNS} php*
	rm -fr /etc/php
	rm -fr /run/php
	rm -fr ${DIR_Service}/multi-user.target.wants/php*.* >/dev/null 2>&1
	rm -fr /lib/systemd/system/php*.* >/dev/null 2>&1
	echo -e "PHP 卸载已完成 "
}

Crontab_Set(){ #设置定时重启任务
	rm -fr /var/run/crond.reboot #cron 无法自动重启时删除
	touch ${DIR}/reboot.sh
	cat <<EOF > ${DIR}/reboot.sh
date +%Y-%m-%d_%H:%M:%S >> ${DIR}/reboot.log
reboot 
EOF
	echo "0 4 * * * ${DIR}/reboot.sh" >> crontab.txt
	crontab crontab.txt
	sleep 1
	systemctl restart cron
	rm -f crontab.txt
}

Acme_Install(){ #安装 ACME
	Domain_Check
	service ${EXE2} stop
	curl https://get.acme.sh | sh -s email=mail@${Domain_Main}
	echo "安装 SSL 证书自动续签"
	rm -fr ${DIR}/${Domain}* >/dev/null 2>&1 #生成 SSL 证书
	~/.acme.sh/acme.sh --issue -d ${Domain} --standalone -k ec-256 --force
	if [[ $? -eq 0 ]];then
	sleep 1
	~/.acme.sh/acme.sh --installcert -d ${Domain} --fullchainpath ${DIR}/${Domain}.crt --keypath ${DIR}/${Domain}.key --ecc #安装 SSL 证书
	CH
	if [[ $? -eq 0 ]];then
		echo -e "SSL 证书配置成功"
	fi
	else
		echo -e "SSL 证书生成失败"
	fi
}

Start_BBR(){ #启用BBR https://teddysun.com/489.html
	echo "net.core.default_qdisc = fq" >> /etc/sysctl.conf
	echo "net.ipv4.tcp_congestion_control = bbr" >> /etc/sysctl.conf
	sysctl -p
}

Remove_All(){ #卸载全部加速
	sed -i '/tcp_retries2/d' /etc/sysctl.conf
	sed -i '/tcp_slow_start_after_idle/d' /etc/sysctl.conf
	sed -i '/tcp_fastopen/d' /etc/sysctl.conf
	sed -i '/file-max/d' /etc/sysctl.conf
	sed -i '/max_user_instances/d' /etc/sysctl.conf
	sed -i '/default_qdisc/d' /etc/sysctl.conf
	sed -i '/tcp_congestion_control/d' /etc/sysctl.conf
	sed -i '/rmem_max/d' /etc/sysctl.conf
	sed -i '/wmem_max/d' /etc/sysctl.conf
	sed -i '/rmem_default/d' /etc/sysctl.conf
	sed -i '/wmem_default/d' /etc/sysctl.conf
	sed -i '/tcp_tw_recycle/d' /etc/sysctl.conf
	sed -i '/tcp_keepalive_time/d' /etc/sysctl.conf
	sed -i '/tcp_rmem/d' /etc/sysctl.conf
	sed -i '/tcp_wmem/d' /etc/sysctl.conf
	sed -i '/tcp_mtu_probing/d' /etc/sysctl.conf
	sed -i '/tcp_syncookies/d' /etc/sysctl.conf
	sed -i '/tcp_fin_timeout/d' /etc/sysctl.conf
	sed -i '/tcp_tw_reuse/d' /etc/sysctl.conf
	sed -i '/tcp_max_syn_backlog/d' /etc/sysctl.conf
	sed -i '/ip_local_port_range/d' /etc/sysctl.conf
	sed -i '/tcp_max_tw_buckets/d' /etc/sysctl.conf
	sed -i '/route.gc_timeout/d' /etc/sysctl.conf
	sed -i '/tcp_synack_retries/d' /etc/sysctl.conf
	sed -i '/tcp_syn_retries/d' /etc/sysctl.conf
	sed -i '/somaxconn/d' /etc/sysctl.conf
	sed -i '/netdev_max_backlog/d' /etc/sysctl.conf
	sed -i '/tcp_timestamps/d' /etc/sysctl.conf
	sed -i '/tcp_max_orphans/d' /etc/sysctl.conf
	sed -i '/ip_forward/d' /etc/sysctl.conf
	echo -e "清除加速完成。"
	sleep 1
}

Optimizing_System(){ #优化系统配置
	echo "net.ipv4.tcp_retries2 = 8
net.ipv4.tcp_slow_start_after_idle = 0
net.ipv4.tcp_fastopen = 3
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_tw_reuse = 1
net.ipv4.ip_local_port_range = 1024 65000
net.ipv4.tcp_max_syn_backlog = 16384
net.ipv4.tcp_max_tw_buckets = 6000
net.ipv4.route.gc_timeout = 100
net.ipv4.tcp_syn_retries = 1
net.ipv4.tcp_synack_retries = 1
net.ipv4.tcp_timestamps = 0
net.ipv4.tcp_max_orphans = 32768
net.ipv4.ip_forward = 1
net.core.somaxconn = 32768
net.core.netdev_max_backlog = 32768
net.core.rmem_max=16777216
net.core.wmem_max=16777216
fs.file-max = 1000000
fs.inotify.max_user_instances = 8192">>/etc/sysctl.conf
	sysctl -p
	echo "*               soft    nofile           1000000
*               hard    nofile          1000000">/etc/security/limits.conf
	echo "ulimit -SHn 1000000">>/etc/profile
	read -p "需要重启VPS，系统优化配置才能生效，是否现在重启 ? [Y/n] :" yn
	[ -z "$yn" ] && yn="y"
	if [[ $yn == [Yy] ]]; then
		echo -e "VPS 重启中..."
		reboot
	fi
}

Menu_Main(){
	Check_BBR
	Check_OS
	Check_Root
	PS3='请输入您的选择: '
	echo ${LINE}
	COLUMNS=1 #限制列数
	select opt in ${EXE2}安装 XR安装 VS安装 SS安装 HY安装 安装依赖 启用BBR加速 停用BBR加速 重启服务器;
	do
	case $opt in
		${EXE2}安装)
			echo "$opt"
			Menu_C
		;;
		XR安装)
			echo "$opt"
			bash <(${GET} http://github.com/ddvcx/sh/raw/master/x.sh)
		;;
		VS安装)
			echo "$opt"
			bash <(${GET} http://github.com/ddvcx/sh/raw/master/v.sh)
		;;
		SS安装)
			echo "$opt"
			bash <(${GET} http://github.com/ddvcx/sh/raw/master/s.sh)
		;;
		HY安装)
			echo "$opt"
			bash <(${GET} http://github.com/ddvcx/sh/raw/master/h.sh)
		;;
		安装依赖)
			echo "$opt"
			Install_Pre
			Menu_Main
		;;
		启用BBR加速)
			echo "$opt"
			Remove_All
			Start_BBR
			Optimizing_System
			Menu_Main
		;;
		停用BBR加速)
			echo "$opt"
			Remove_All
			Menu_Main
		;;
		重启服务器)
			echo "$opt"
			reboot
		;;
		*)
			echo "退出菜单"
			exit
		;;
	esac
	done
}

Menu_C(){
	PS3='请输入您的选择: '
	echo ${LINE}
	COLUMNS=1 #限制列数
	select opt in ${EXE2}和PHP安装 ${EXE2}安装 ${EXE2}卸载 ${EXE2}修改设置 安装SSL证书 返回主菜单;
	do
	case $opt in
		${EXE2}和PHP安装)
			echo "$opt"
			Domain_Check
			Port_Check
			Install_Pre
			UnInstall_Php
			UnInstall_Exe
			Install_Php
			Install_Exe
			Service_Set
			Acme_Install
			Service_On
			Show_Status
			Menu_C
		;;
		${EXE2}安装)
			echo "$opt"
			Domain_Check
			Port_Check
			UnInstall_Exe
			Install_Exe
			Service_Set
			Service_On
			Show_Status
			Menu_C
		;;
		${EXE2}卸载)
			echo "$opt"
			UnInstall_Php
			UnInstall_Exe
			Menu_C
		;;
		${EXE2}修改设置)
			echo "$opt"
			nano ${DIR}/${EXEC}
			Service_On
			Menu_C
		;;
		安装SSL证书)
			echo "$opt"
			Acme_Install
			Menu_C
		;;
		返回主菜单)
			echo "$opt"
			Menu_Main
		;;
		*)
			echo "返回主菜单"
			Menu_Main
		;;
	esac
	done
}

Menu_Main

action=$1
[[ -z $1 ]] && action=install
case "$action" in
    install|uninstall)
    ${action}_server
    ;;
    *)
    echo "输入错误 !"
    echo "用法: {install | uninstall}"
    ;;
esac

	sleep 1
}
