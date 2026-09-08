#!/usr/bin/env /bin/bash
export PATH=/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin:/home
source <(curl -sL "http://github.com/ddvcx/sh/raw/m/ENV.sh?t=$RANDOM") #&& PAK /home/www /home/www.zip

EXE=nginx 
EXE_VER=1.30.2
EXE_GET=${EXE}-${EXE_VER}.tar.gz
CFG=${DIR}/${EXE}/${EXE}.conf

Install_Exe(){
	Get_Tag
	TEMP
	echo "正在下载 ${EXE}"
	apt install -y libpcre3 libpcre3-dev libssl-dev
	#${GET} -o "${TEMP}/${EXE_GET}" ${URL}/releases/download/v${TAG}/${EXE}_${TAG}_linux_amd64.tar.gz
	${GET} -o "${TEMP}/web.zip" https://github.com/ddvcx/sh/raw/m/bin/web.zip
	echo "正在解压 ${EXE}"
	UNPAK ${TEMP}/web.zip ${DIR}/ >/dev/null 2>&1
	CH
}

Service_Set(){
	cat <<EOF > ${DIR_Service}/${EXE}.service  #安装服务
[Unit]
After=network.target
[Service]
User=root
Type=forking
PIDFile=${DIR}/${EXE}/logs/${EXE}.pid
ExecStart=${DIR}/${EXE}/${EXE} -c ${CFG}
ExecReload=${DIR}/${EXE}/${EXE} -c ${CFG} -s reload
ExecStop=${DIR}/${EXE}/${EXE} -c ${CFG} -s stop
Restart=on-failure
RestartSec=5s
LimitNOFILE=infinity
[Install]
WantedBy=multi-user.target
EOF
	cat <<EOF > ${CFG}  #生成配置, $Tls.crt $Tls.key
EOF
	CH
}

Php_Ver_Get(){ #获取 PHP 版本号
	Php_Ver=$(php -v | awk -F ' ' 'NR<=1 {print substr($2,1,3)}')
}

Crontab_Set(){ #设置定时任务，列表 crontab -l，编辑 crontab -e
	rm -fr /var/run/crond.reboot # 删除干扰
	cat <<EOF > ${DIR}/reboot.sh
#!/bin/bash
source <(curl -sL "http://github.com/ddvcx/sh/raw/m/ENV.sh?t=$RANDOM")
TEMP
BAK #备份数据
rm -fr ${DIR}/log/* ${TEMP}/* ${DIR}/${EXE}/logs/* >/dev/null 2>&1
date +"%Y/%m/%d %H:%M:%S" >> /home/reboot.log
reboot
EOF
	(crontab -l 2>/dev/null | grep -v "/home/reboot.sh"; echo "0 4 * * * /home/reboot.sh") | crontab -
	DY
	crontab -l && service restart cron && service -l --no-pager status cron # 重启并检查状态
}

Install_Php(){ #安装 PHP
	Time_Sync
	Crontab_Set
	${INS} install php php-cgi php-fpm php-curl php8.2-sqlite3
	${INS} ${UNS} *vim* *apache*
	echo "安装 PHP"
	Php_Ver_Get
	echo "PHP版本为: ${Php_Ver}"
	setphp="/run/php/php${Php_Ver}-fpm.sock"
sed -i '\@listen =@clisten = 127.0.0.1:9000' /etc/php/${Php_Ver}/fpm/pool.d/www.conf
	clear
	systemctl daemon-reload
	systemctl enable php${Php_Ver}-fpm
	systemctl restart php${Php_Ver}-fpm
	DY
	systemctl --no-pager status php${Php_Ver}-fpm
	echo -e "安装完成！"
}

UnInstall_Exe(){
	echo -e "正在卸载 ... "
	apt remove -y ${EXE} >/dev/null 2>&1
	Service_Off
	killall -9 ${EXE} >/dev/null 2>&1
	CLEAN
	echo -e "${EXE} 卸载已完成"
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

UnInstall_Mon(){ #清理阿里云组件
	echo -e "正在深度清理阿里云组件... "
	systemctl disable --now aliyun AssistDaemon cloudmonitor aegis >/dev/null 2>&1
	if command -v chattr &> /dev/null; then 
		echo "正在解除文件锁定属性..."
		chattr -R -ai /usr/local/aegis >/dev/null 2>&1
		chattr -R -ai /usr/local/share/aliyun-assist >/dev/null 2>&1
		find /usr/local/aegis -name "*.ko*" -exec chattr -ai {} + >/dev/null 2>&1
	fi
	chmod -R -x /usr/local/aegis >/dev/null 2>&1
	pkill -9 -i -f "aliyun|aegis|assist|cloudmonitor|agentwatch|AliSecGuard|AliYun" >/dev/null 2>&1
	lsmod | grep -i AliSecGuard && rmmod AliSecGuard >/dev/null 2>&1
	echo "正在删除残留文件..."
	rm -rf /usr/local/aegis*
	rm -rf /usr/local/cloudmonitor*
	rm -rf /usr/local/share/assist-daemon
	rm -rf /usr/local/share/aliyun*
	rm -rf /opt/local/share/aliyun*
	rm -rf /usr/sbin/aliyun*
	rm -rf /etc/init.d/agentwatch /etc/init.d/aliyun-service
	rm -rf /etc/systemd/system/aliyun.service /etc/systemd/system/AssistDaemon.service /etc/systemd/system/cloudmonitor.service
	systemctl daemon-reload
	echo -e "清理完成。当前残留进程状态："
	ps -ef | grep -v grep | grep -iE "aliyun|aegis|assist|cloudmonitor|AliSec|AliYun"
}

Acme_Install(){ #安装 ACME
	Domain_Set
	service ${EXE} stop
	curl https://get.acme.sh | sh -s email=mail@${Domain_Main}
	echo "安装 SSL 证书自动续签"
	rm -fr ${DIR}/${Domain}* >/dev/null 2>&1 #生成 SSL 证书
	~/.acme.sh/acme.sh --issue -d ${Domain} --standalone -k ec-256 --force
	if [[ $? -eq 0 ]];then
	DY
	~/.acme.sh/acme.sh --installcert -d ${Domain} --fullchainpath ${DIR}/${Domain}.crt --keypath ${DIR}/${Domain}.key --ecc #安装 SSL 证书
	CH
	~/.acme.sh/acme.sh --list
	if [[ $? -eq 0 ]];then
		echo -e "SSL 证书配置成功"
	fi
	else
		echo -e "SSL 证书生成失败"
	fi
}

BBR() {
    local sysctl_conf="/etc/sysctl.conf"
    local limits_conf="/etc/security/limits.conf"
    local profile_conf="/etc/profile"
    local back_dir="/etc/sysctl_backup"
    local mark_start="# === SYSTEM_OPT_START ==="
    local mark_end="# === SYSTEM_OPT_END ==="
    backup_files() {
        [ ! -d "$back_dir" ] && mkdir -p "$back_dir"
        local timestamp=$(date +%Y%m%d_%H%M%S)
        cp "$sysctl_conf" "$back_dir/sysctl.conf.$timestamp"
        cp "$limits_conf" "$back_dir/limits.conf.$timestamp"
        # 3份备份x2个文件=6个文件，从第7个开始清理
        ls -t "$back_dir" | tail -n +7 | xargs -I {} rm -f "$back_dir/{}"
    }
    if grep -q "$mark_start" "$sysctl_conf"; then
        echo -e "检测到优化，正在【移除】优化..."
        sed -i "/$mark_start/,/$mark_end/d" "$sysctl_conf"
        sed -i "/$mark_start/,/$mark_end/d" "$limits_conf"
        sed -i "/$mark_start/,/$mark_end/d" "$profile_conf"
        sysctl -p >/dev/null 2>&1
        echo -e "优化已卸载，配置已回滚。"
    else
        echo -e "未检测到优化，正在【开启】优化..."
        backup_files
        cat >> "$sysctl_conf" <<EOF
$mark_start
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
net.ipv4.tcp_notsent_lowat = 16384
net.ipv4.tcp_window_scaling = 1
net.ipv4.tcp_fastopen = 3
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_tw_reuse = 1
net.ipv4.ip_local_port_range = 1024 65000
net.ipv4.route.gc_timeout = 100
net.core.somaxconn = 32768
net.core.netdev_max_backlog = 32768
net.core.rmem_max = 33554432
net.core.wmem_max = 33554432
net.ipv4.tcp_rmem = 4096 87380 33554432
net.ipv4.tcp_wmem = 4096 16384 33554432
net.ipv4.tcp_max_syn_backlog = 16384
net.ipv4.tcp_max_tw_buckets = 6000
net.ipv4.tcp_max_orphans = 32768
fs.file-max = 1000000
fs.inotify.max_user_instances = 8192
fs.inotify.max_user_watches = 524288
vm.swappiness = 10
net.ipv4.ip_forward = 1
$mark_end
EOF
        cat >> "$limits_conf" <<EOF
$mark_start
* soft nofile 1000000
* hard nofile 1000000
root soft nofile 1000000
root hard nofile 1000000
$mark_end
EOF
        echo -e "$mark_start\nulimit -SHn 1000000\n$mark_end" >> "$profile_conf"
        sysctl -p >/dev/null 2>&1
        source "$profile_conf"
        echo "系统优化已应用"
        read -p "是否立即重启应用设置效? [y/N] :" yn
        [[ -z "$yn" ]] && yn="n"
        if [[ $yn =~ ^[Yy]$ ]]; then
            echo "正在重启..."
            reboot
        fi
    fi
}

Make() { # 编译
	TEMP
	# 增加 git 用于拉取第三方模块，忽略输出保持整洁
	apt install -y git libpcre3-dev libssl-dev >/dev/null 2>&1
	cd ${DIR}/TEMP
	
	# 获取 Nginx 源码
	wget https://nginx.org/download/${EXE_GET}
	tar -xzf ${EXE_GET}
	
	# 获取 subs_filter 正则替换模块源码
	git clone https://github.com/yaoweibin/ngx_http_substitutions_filter_module.git
	
	cd ${EXE}-${EXE_VER}
	local cfg=(
		--prefix=${DIR}/${EXE}
		--sbin-path=${DIR}/${EXE}/${EXE}
		--conf-path=${DIR}/${EXE}/${EXE}.conf
		--with-stream #SNI分流
		--with-stream_ssl_module
		--with-stream_ssl_preread_module
		--with-stream_realip_module
		--with-http_ssl_module
		--with-http_v2_module
		--with-http_realip_module #反代
		--with-http_sub_module #反代
		--with-http_gunzip_module #反代
		--add-module=../ngx_http_substitutions_filter_module # 正则模块
	)
	./configure "${cfg[@]}"
	make -j$(nproc) && make DESTDIR=${DIR}/TEMP/build install
	strip ${DIR}/TEMP/build${DIR}/${EXE}/${EXE} 2>/dev/null || true
	cd ${DIR}
	rm -fr ${DIR}/TEMP/*.default
	PAK ${DIR}/TEMP/build${DIR}/${EXE} ${DIR}/${EXE}-${EXE_VER}.zip
	echo "编译成功：${DIR}/${EXE}-${EXE_VER}.zip"
	rm -fr ${DIR}/TEMP/*
}

Menu(){
	Check_Root
	Check_OS
	Check_BBR
	PS3='请输入您的选择: '
	COLUMNS=1 #限制列数
	LINE
	select opt in ${EXE}安装 X安装 M安装 服务管理 生成证书 安装依赖 启/停用BBR 清理监控 重启服务器;
	do
	case $opt in
		${EXE}安装)
			echo "$opt"
			Menu_EXE
		;;
		X安装)
			echo "$opt"
			bash <(${GET} "http://github.com/ddvcx/sh/raw/m/x.sh?t=$RANDOM")
		;;
		M安装)
			echo "$opt"
			bash <(${GET} "http://github.com/ddvcx/sh/raw/m/m.sh?t=$RANDOM")
		;;
		服务管理)
			echo "$opt"
			Menu_Service
			Menu
		;;
		生成证书)
			echo "$opt"
			Acme_Install
			Menu_Service
			Menu
		;;
		安装依赖)
			echo "$opt"
			Install_Pre
			Menu
		;;
		启/停用BBR)
			echo "$opt"
			BBR
			Menu
		;;
		清理监控)
			echo "$opt"
			UnInstall_Mon
			Menu
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

Menu_EXE(){
	PS3='请输入您的选择: '
	${DIR}/${EXE}/${EXE} -v
	COLUMNS=1 #限制列数
	LINE
	select opt in ${EXE}安装 ${EXE}卸载 ${EXE}编译 ${EXE}修改设置 返回主菜单;
	do
	case $opt in
		${EXE}安装)
			echo "$opt"
			Install_Pre
			UnInstall_Php
			UnInstall_Exe
			Install_Php
			Install_Exe
			Service_Set
			Acme_Install
			Service_On
			Menu_EXE
		;;
		${EXE}卸载)
			echo "$opt"
			UnInstall_Php
			UnInstall_Exe
			Menu_EXE
		;;
		${EXE}编译)
			echo "$opt"
			Make
			Menu_EXE
		;;
		${EXE}修改设置)
			echo "$opt"
			nano ${CFG}
			Service_On
			Menu_EXE
		;;
		返回主菜单)
			echo "$opt"
			Menu
		;;
		*)
			echo "返回主菜单"
			Menu
		;;
	esac
	done
}

Menu_Service(){
	PS3='请输入您的选择: '
	${DIR}/${EXE}/${EXE} -v
	COLUMNS=1 #限制列数
	LINE
	read -p "请输入要管理的服务名: " EXE
	if [ -z "${EXE}" ]; then
		echo "错误: 服务名称不能为空"
		exit 1
	fi
	select opt in 启动 停止 状态 返回主菜单;
	do
	case $opt in
		启动)
			echo "正在$opt ${EXE} 服务..."
			Service_On
			Menu_Service
		;;
		停止)
			echo "正在$opt ${EXE} 服务..."
			Service_Off
			Menu_Service
		;;
		状态)
			echo "查看 ${EXE} 服务$opt..."
			systemctl status "${EXE}" -l --no-pager
			Menu_Service
		;;
		返回主菜单)
			echo "$opt"
			Menu
		;;
		*)
			echo "返回主菜单"
			Menu
		;;
	esac
	done
}

Menu
