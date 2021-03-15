#!/usr/bin/env /bin/bash
PATH=/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin:~/bin
export PATH

DIR="/usr/local/bin"
DIR_Service="/etc/systemd/system"
Domain=""
Domain_Main=""
Name_S=caddy
Name_S2=c
Line="---------------------------------------"

Check_Root(){
	[[ `whoami` != 'root' ]] && echo -e "请使用root权限运行" && exit 1
}

Check_OS(){
	if [[ -s /etc/redhat-release ]]; then
		version=`grep -oE  "[0-9.]+" /etc/redhat-release | cut -d . -f 1`
	else
		version=`grep -oE  "[0-9.]+" /etc/issue | cut -d . -f 1`
	fi
	bit=`uname -m`
	if [[ ${bit} = "x86_64" ]]; then
		bit="x64"
	else
		bit="x32"
	fi
	echo $Line
	if cat /etc/issue | grep -q -E -i "debian"; then
		release="debian"
		INS="apt -y"
		UNS="purge"
		echo "当前系统为 ${release} ${version} ${bit}"
	elif cat /etc/issue | grep -q -E -i "ubuntu"; then
		release="ubuntu"
		INS="apt -y"
		UNS="purge"
		echo "当前系统为 ${release} ${version} ${bit}"
	else
		echo "不支持的系统"
    fi
}

Check_BBR(){ #检查安装BBR的系统要求
	if [[ "${release}" == "debian" ]]; then
		if [[ ${version} -ge "8" ]]; then
			Menu_Main
		else
			echo -e "BBR内核不支持当前系统 ${release} ${version} ${bit} !" && exit 1
		fi
	elif [[ "${release}" == "ubuntu" ]]; then
		if [[ ${version} -ge "14" ]]; then
			Menu_Main
		else
			echo -e "BBR内核不支持当前系统 ${release} ${version} ${bit} !" && exit 1
		fi
	else
		echo -e "BBR内核不支持当前系统 ${release} ${version} ${bit} !" && exit 1
	fi
}

Check_BBR_Status(){
	kernel_version=`uname -r | awk -F "-" '{print $1}'`
	if [[ `echo ${kernel_version} | awk -F'.' '{print $1}'` == "4" ]] && [[ `echo ${kernel_version} | awk -F'.' '{print $2}'` -ge 9 ]] || [[ `echo ${kernel_version} | awk -F'.' '{print $1}'` == "5" ]]; then
		Status_Kernel="BBR"
	else 
		Status_Kernel="noinstall"
	fi
	if [[ ${Status_Kernel} == "BBR" ]]; then
		Status_BBR=$(sysctl net.ipv4.tcp_congestion_control | awk '{print $3}')
		if [[ "${Status_BBR}" == "bbr" ]]; then
			Status_BBR="BBR已开启"
		else
			Status_BBR="BBR未开启"
		fi
	fi
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
	clear
	echo -e "清除加速完成。"
	sleep 1
}

Optimizing_System(){ #优化系统配置
	echo "net.ipv4.tcp_retries2 = 8
net.ipv4.tcp_slow_start_after_idle = 0
net.ipv4.tcp_fastopen = 3
fs.file-max = 1000000
fs.inotify.max_user_instances = 8192
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_tw_reuse = 1
net.ipv4.ip_local_port_range = 1024 65000
net.ipv4.tcp_max_syn_backlog = 16384
net.ipv4.tcp_max_tw_buckets = 6000
net.ipv4.route.gc_timeout = 100
net.ipv4.tcp_syn_retries = 1
net.ipv4.tcp_synack_retries = 1
net.core.somaxconn = 32768
net.core.netdev_max_backlog = 32768
net.ipv4.tcp_timestamps = 0
net.ipv4.tcp_max_orphans = 32768
net.ipv4.ip_forward = 1">>/etc/sysctl.conf
	sysctl -p
	echo "*               soft    nofile           1000000
*               hard    nofile          1000000">/etc/security/limits.conf
	echo "ulimit -SHn 1000000">>/etc/profile
	read -p "需要重启VPS，系统优化配置才能生效，是否现在重启 ? [Y/n] :" yn
	[ -z "${yn}" ] && yn="y"
	if [[ $yn == [Yy] ]]; then
		echo -e "VPS 重启中..."
		reboot
	fi
}

Start_BBR(){ #启用BBR https://teddysun.com/489.html
	echo "net.core.default_qdisc = fq" >> /etc/sysctl.conf
	echo "net.ipv4.tcp_congestion_control = bbr" >> /etc/sysctl.conf
	sysctl -p
}

Install_Pre(){ #安装依赖
	clear
	${INS} update
	${INS} upgrade
	${INS} install curl nano net-tools ntpdate screen socat unzip wget
	${INS} --fix-broken install
	${INS} remove *vim* *apache*
	${INS} remove apache2
	${INS} autoremove
	${INS} install netcat
}
echo "net.core.default_qdisc=fq" >> /etc/sysctl.conf
echo "net.ipv4.tcp_congestion_control=bbr" >> /etc/sysctl.conf
Domain_Check(){ #检查域名变量
	if [ $Domain ] ;then
		echo "域名已设置"
	else
		Domain_set
	fi
}

Domain_set(){ #输入域名
	echo -e "请输入您的域名: "
	stty erase '^H' && read -e -p "请输入：" Domain
	[[ -z ${Domain} ]] && Domain="none"
	if [ "${Domain}" = "none" ] ;then
		echo -e "请正确输入域名"
		Domain_set
	else
	Tls="${DIR}/${Domain}"
	# F参数定义分隔符(默认空格)，NR第1行，substr第2列，1-3个字符，$NF为最后列
	Domain_Main=$(echo "${Domain}" | awk -F '.' 'NR<=1 {print $(NF-1)"."$NF}')
	echo -e "您设置的域名为：${Domain}，主域名为：${Domain_Main}"
	fi
}

#同步服务器时间
Time_Sync(){
	cp -f /usr/share/zoneinfo/Asia/Shanghai /etc/localtime #修改时区
	systemctl stop ntp &>/dev/null
	echo -e "正在进行时间同步"
	ntpdate pool.ntp.org
	if [[ $? -eq 0 ]];then 
		echo -e "时间同步成功，当前系统时间 `date -R`"
		sleep 1
	else
		echo -e "时间同步失败，请检查 NTPdate 服务是否正常工作"
	fi 
}

Crontab_Set(){ #设置定时重启任务
	rm -f /var/run/crond.reboot #cron 无法自动重启时删除
	touch ${DIR}/reboot.sh
	cat <<EOF > ${DIR}/reboot.sh
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
	Install_Pre
	service ${Name_S2} stop
	curl  https://get.acme.sh | sh
	echo "安装 SSL 证书自动续签"
	rm -fr ${DIR}/${Domain}* >/dev/null 2>&1 #生成 SSL 证书
	~/.acme.sh/acme.sh --issue -d ${Domain} --standalone -k ec-256 --force
	if [[ $? -eq 0 ]];then
	sleep 1
	~/.acme.sh/acme.sh --installcert -d ${Domain} --fullchainpath ${DIR}/${Domain}.crt --keypath ${DIR}/${Domain}.key --ecc #安装 SSL 证书
	if [[ $? -eq 0 ]];then
		echo -e "SSL 证书配置成功"
		Menu_Main
	fi
	else
		echo -e "SSL 证书生成失败"
		Menu_Main
	fi
}

Download(){
	wget https://raw.githubusercontent.com/ddvcx/sh/master/web.zip
	unzip -o web.zip -d ${DIR}/
	rm -fr web.zip
	chmod -R 777 ${DIR}
}

Service_Set(){
	setcap cap_net_bind_service=+ep $(which ${Name_S2})
	touch ${DIR_Service}/${Name_S2}.service #安装服务
	cat <<EOF > ${DIR_Service}/${Name_S2}.service
[Unit]
Description=Test ${Name_S2}
After=network.target
[Service]
User=root
ExecStart=${DIR}/${Name_S2} -conf=${DIR}/${Name_S2}${Name_S2} -agree=true
ExecReload=/bin/kill -HUP 
Restart=on-failure
RestartSec=3s
LimitNOFILE=1048576
LimitNPROC=512
ReadWritePaths=${DIR}/
ReadWriteDirectories=${DIR}/
[Install]
WantedBy=multi-user.target
EOF
	touch ${DIR}/${Name_S2}${Name_S2}  #生成配置, tls ${Tls}.crt ${Tls}.key
	cat <<EOF > ${DIR}/${Name_S2}${Name_S2}
${Domain}:80 {
	root ${DIR}/www
	fastcgi / localhost:9000 php {
		env PATH /bin
	}
}
n.${Domain_Main}:80 {
	root ${DIR}/www/note
	fastcgi / localhost:9000 php {
		env PATH /bin
	}
	rewrite {
		regexp ^/([a-zA-Z0-9_-]+)$
		to {uri} {uri}/ /index.php?note={1}
	}
}
EOF
	chmod -R 777 ${DIR}
	chmod -R 777 ${DIR_Service}
	systemctl daemon-reload
	systemctl enable ${Name_S2}.service
	systemctl restart ${Name_S2}
}

Php_ver_get(){ #获取 PHP 版本号
	Php_ver=$(php -v | awk -F ' ' 'NR<=1 {print substr($2,1,3)}')
	sleep 1
}

Install_Php(){ #安装 PHP
	${INS} install php php-cgi php-fpm php-curl
	echo "安装 PHP"
	Php_ver_get
	echo "PHP版本为: ${Php_ver}"
	setphp="/run/php/php${Php_ver}-fpm.sock"
sed -i '\@listen =@clisten = localhost:9000' /etc/php/${Php_ver}/fpm/pool.d/www.conf
	systemctl daemon-reload
	systemctl enable php${Php_ver}-fpm
	systemctl restart php${Php_ver}-fpm
}

UnInstall_Php(){ #卸载 PHP
	echo -e "正在卸载 PHP 请稍后 ... "
	Php_ver_get
	systemctl disable php${Php_ver}-fpm
	systemctl stop php${Php_ver}-fpm
	${INS} ${UNS} php*
	rm -fr /etc/php
	rm -fr /run/php
	echo -e "PHP 卸载已完成 "
}

UnInstall_Server(){
	echo -e "正在卸载 ... "
	systemctl disable ${Name_S2} >/dev/null 2>&1
	systemctl stop ${Name_S2} >/dev/null 2>&1
	killall -9 ${Name_S2} >/dev/null 2>&1
	rm -fr ${DIR}/${Name_S}*  ${DIR}/${Name_S2}  ${DIR}/${Name_S2}${Name_S2} >/dev/null 2>&1
	rm -fr ${DIR_Service}/${Name_S}*.service ${DIR_Service}/${Name_S2}.service >/dev/null 2>&1
	UnInstall_Php
	echo -e "Server 卸载已完成"
}

Install_Server(){
	clear
	Domain_Check
	UnInstall_Server
	Install_Pre
	Time_Sync
	Crontab_Set
	Install_Php
	Download
	Service_Set
	echo && echo -e "安装完成！" && echo
}

Menu_Main(){
	Check_BBR_Status
	[[ ${release} != "debian" ]] && [[ ${release} != "ubuntu" ]] && echo -e "本脚本不支持当前系统 ${release} !" && exit 1
	if [[ ${Status_Kernel} == "noinstall" ]]; then
		echo -e "当前状态: 内核不支持BBR加速"
	else
		echo -e "当前状态: 内核支持${Status_Kernel}加速 , ${Status_BBR}"
	fi
	PS3='请输入您的选择: '
	echo $Line
	COLUMNS=1 #限制列数
	select opt in Caddy安装 Caddy卸载 Caddy修改设置 安装SSL证书 XRay安装 启用BBR加速 停用BBR加速 重启服务器;
	do
	case $opt in
		Caddy安装)
			echo "$opt"
			Install_Server
			Acme_Install
			Menu_Main
		;;
		Caddy卸载)
			echo "$opt"
			UnInstall_Server
			Menu_Main
		;;
		Caddy修改设置)
			echo "$opt"
			nano ${DIR}/${Name_S2}${Name_S2}
			systemctl daemon-reload
			systemctl enable ${Name_S2}.service
			systemctl restart ${Name_S2}
			sleep 1
			systemctl status ${Name_S2}
			Menu_Main
		;;
		安装SSL证书)
			echo "$opt"
			Acme_Install
			Menu_Main
		;;
		XRay安装)
			echo "$opt"
			bash -c "$(wget --no-check-certificate -O- http://raw.githubusercontent.com/ddvcx/sh/master/x.sh)"
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

Check_OS
Check_Root
Check_BBR
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
