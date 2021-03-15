#!/usr/bin/env /bin/bash
PATH=/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin:~/bin
export PATH

DIR="/usr/local/bin"
DIR_Service="/etc/systemd/system"
Domain=""
Domain_Main=""
Name_X=xray
Name_X2="x"
Line="---------------------------------------"

Domain_Check(){ #检查域名变量
	if [ $Domain ] ;then
		echo "域名已设置"
	else
		Domain_Set
	fi
}

Password_Check(){ #检查密码变量
	if [ $Password ] ;then
		echo "UUID已设置"
	else
		Password_Set
	fi
}

Domain_Set(){ #输入域名
	echo -e "请输入您的域名: "
	stty erase '^H' && read -e -p "请输入：" Domain
	[[ -z ${Domain} ]] && Domain="none"
	if [ "${Domain}" = "none" ] ;then
		echo -e "请正确输入域名"
		Domain_Set
	else
	Tls="${DIR}/${Domain}"
	# F参数定义分隔符(默认空格)，NR第1行，substr第2列，1-3个字符，$NF为最后列
	Domain_Main=$(echo "${Domain}" | awk -F '.' 'NR<=1 {print $(NF-1)"."$NF}')
	echo -e "您设置的域名为：${Domain}，主域名为：${Domain_Main}"
	fi
}

Password_Set(){ #设置密码
	echo -e "请设置UUID"
	stty erase '^H' && read -e -p "请输入：" Password
	[[ -z ${Password} ]] && Password="none"
	if [ "${Password}" = "none" ] ;then
		echo -e "请正确输入UUID"
		Password_Set
	else
	echo -e "您设置的UUID为：${Password}"
	fi
}

Download(){
	bash <(curl -L https://raw.githubusercontent.com/XTLS/Xray-install/main/install-release.sh) #安装
	sleep 1
	mv -f /usr/local/bin/${Name_X} ${DIR}/${Name_X2}
	mv -f ${DIR_Service}/${Name_X}.service ${DIR_Service}/${Name_X2}.service
	find ${DIR_Service} -name "*${Name_X}*" | xargs rm -rf
	chmod -R 777 ${DIR}
}

Service_Set(){
	touch ${DIR_Service}/${Name_X2}.service #设置服务
	cat <<EOF > ${DIR_Service}/${Name_X2}.service
[Unit]
Description=Test ${Name_X2}
After=network.target nss-lookup.target
[Service]
User=nobody
CapabilityBoundingSet=CAP_NET_ADMIN CAP_NET_BIND_SERVICE
AmbientCapabilities=CAP_NET_ADMIN CAP_NET_BIND_SERVICE
NoNewPrivileges=true
ExecStart="${DIR}/x" run -config "${DIR}/xx"
Restart=on-failure
RestartPreventExitStatus=23
[Install]
WantedBy=multi-user.target
EOF
	touch ${DIR}/${Name_X2}${Name_X2} #生成配置, tls ${Tls}.crt ${Tls}.key
	cat <<EOF > ${DIR}/${Name_X2}${Name_X2}
{
    "inbounds": [
        {
            "listen": "0.0.0.0",
            "port": 443,
            "protocol": "vless",
            "settings": {
                "clients": [
                    {
                        "id": "${Password}",
                        "flow": "xtls-rprx-direct",
                    }
                ],
                "decryption": "none",
                "fallbacks": [
                    {
                        "dest": 80,
                        "xver": 0
                    }
                ]
            },
            "streamSettings": {
                "network": "tcp",
                "security": "xtls",
                "xtlsSettings": {
                    "alpn": ["http/1.1"],
                    "certificates": [
                        {
                            "certificateFile": "${Tls}.crt",
                            "keyFile": "${Tls}.key"
                        }
                    ]
                }
            }
        }
    ],
    "outbounds": [
        {
            "protocol": "freedom"
        }
    ],
    "routing": {
		"domainStrategy": "AsIs",
		"rules": [
			{
				"type": "field",
				"outboundTag": "block",
				"protocol": ["bittorrent"]
			}
		]
	}
}
EOF
	chmod -R 777 ${DIR}
	chmod -R 777 ${DIR_Service}
	systemctl daemon-reload
	systemctl enable ${Name_X2}.service
	systemctl restart ${Name_X2}
}

UnInstall_Server(){
	echo -e "正在卸载 ... "
	systemctl disable ${Name_X2} >/dev/null 2>&1
	systemctl stop ${Name_X2} >/dev/null 2>&1
	killall -9 ${Name_X2} >/dev/null 2>&1
	rm -fr /usr/local/bin/${Name_X} ${DIR}/${Name_X2} ${DIR}/${Name_X2}${Name_X2} >/dev/null 2>&1
	rm -fr ${DIR_Service}/${Name_X}*.service ${DIR_Service}/${Name_X2}.service >/dev/null 2>&1
	rm -fr /var/log/${Name_X2} /etc/init.d/${Name_X2} /usr/local/etc/${Name_X} >/dev/null 2>&1
	echo -e "Server 卸载已完成"
}

Install_Server(){
	clear
	Domain_Check
	Password_Check
	UnInstall_Server
	Download
	Service_Set
	echo -e "安装完成！"
}

Update_Server(){
	File_x="${DIR}/${Name_X2}"
	if [ ! -f ${File_x} ]; then
		echo -e "${Name_X}没有安装，开始安装"
		Install_Server
	else
		echo -e "正在更新${Name_X}"
		mv -f ${DIR}/${Name_X2}${Name_X2} ${DIR}/bak
		UnInstall_Server
		Download
		Service_Set
		mv -f ${DIR}/bak ${DIR}/${Name_X2}${Name_X2}
		echo -e "更新完成"
	fi
}

Menu_Main(){
	PS3='请输入您的选择: '
	echo $Line
	COLUMNS=1 #限制列数
	select opt in ${Name_X}安装 ${Name_X}更新 ${Name_X}卸载 ${Name_X}修改设置 重启服务器;
	do
	case $opt in
		${Name_X}安装)
			echo "$opt"
			Install_Server
			Menu_Main
		;;
		${Name_X}更新)
			echo "$opt"
			Update_Server
			Menu_Main
		;;
		${Name_X}卸载)
			echo "$opt"
			UnInstall_Server
			Menu_Main
		;;
		${Name_X}修改设置)
			echo "$opt"
			nano ${DIR}/${Name_X2}${Name_X2}
			service ${Name_X2} restart
			sleep 1
			service ${Name_X2} status
			Menu_Main
		;;
		重启服务器)
			echo "$opt"
			reboot
		;;
		*)
			echo "返回主菜单"
			bash -c "$(wget --no-check-certificate -O- http://raw.githubusercontent.com/ddvcx/sh/master/c.sh)"
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
