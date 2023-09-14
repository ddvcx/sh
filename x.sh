#!/usr/bin/env /bin/bash
export PATH=/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin:/home
source <(curl -sL http://github.com/ddvcx/sh/raw/m/ENV.sh)

EXE=xray
EXE2=x
URL="https://github.com/XTLS/Xray-install/raw/main/install-release.sh"

Download(){
	bash <(${GET} ${URL}) #安装
	sleep 1
	mv -f /usr/local/bin/${EXE} ${DIR}/${EXE2}
	CH
}

Service_Set(){
	touch ${DIR_Service}/${EXE2}.service #设置服务
	cat <<EOF > ${DIR_Service}/${EXE2}.service
[Unit]
After=network.target
[Service]
User=root
CapabilityBoundingSet=CAP_NET_BIND_SERVICE CAP_NET_RAW
AmbientCapabilities=CAP_NET_BIND_SERVICE CAP_NET_RAW
NoNewPrivileges=true
ExecStart="${DIR}/${EXE2}" run -config "${DIR}/${EXE2}.json" --format=json
Restart=on-failure
RestartSec=3
[Install]
WantedBy=multi-user.target
EOF
	touch ${DIR}/${EXE2}.json #生成配置, ${Tls}.crt ${Tls}.key
	cat <<EOF > ${DIR}/${EXE2}.json
{
	"inbounds": [
		{
			"port": 443,
			"protocol": "vless",
			"settings": {
				"clients": [
					{
						"id": "$Password",
						"flow": "xtls-rprx-vision"
					}
				],
				"decryption": "none",
				"fallbacks": [
					{
						"dest": 80
					},
					{
						"path": "/test",
						"dest": $Port,
						"xver": 1
					}
				]
			},
			"streamSettings": {
				"network": "tcp",
				"security": "tls",
				"tlsSettings": {
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
	CH
	Service_On
}

UnInstall_Server(){
	echo -e "正在卸载 ... "
	Service_Off
	killall -9 ${EXE2} >/dev/null 2>&1
	rm -fr ${DIR}/${EXE2}* >/dev/null 2>&1
	rm -fr ${DIR_Service}/${EXE}* ${EXE}*.service >/dev/null 2>&1
	rm -fr ${DIR_Service}/${EXE2}* ${EXE2}.service >/dev/null 2>&1
	rm -fr /var/log/${EXE2} /etc/init.d/${EXE2} /usr/local/etc/${EXE2} >/dev/null 2>&1
	echo -e "Server 卸载已完成"
}

Install_Server(){
	clear
	Domain_Check
	Port_Check
	Password_Check
	UnInstall_Server
	Download
	Service_Set
	echo -e "安装完成"
	Show_Status
	Service_On
}

Update_Server(){
	File_X="${DIR}/${EXE2}"
	if [ ! -f ${File_X} ]; then
		echo -e "${EXE2} 没有安装，开始安装"
		Install_Server
	else
		echo -e "正在更新${EXE2}"
		mv -f ${DIR}/${EXE2}.json ${DIR}/bak
		UnInstall_Server
		Download
		Service_Set
		mv -f ${DIR}/bak ${DIR}/${EXE2}.json
		echo -e "更新完成"
	fi
}

Menu_Main(){
	PS3='请输入您的选择: '
	echo ${LINE}
	COLUMNS=1 #限制列数
	select opt in ${EXE2}安装 ${EXE2}更新 ${EXE2}卸载 ${EXE2}修改设置 返回主菜单;
	do
	case $opt in
		${EXE2}安装)
			echo "$opt"
			Install_Server
			Menu_Main
		;;
		${EXE2}更新)
			echo "$opt"
			Update_Server
			Menu_Main
		;;
		${EXE2}卸载)
			echo "$opt"
			UnInstall_Server
			Menu_Main
		;;
		${EXE2}修改设置)
			echo "$opt"
			nano ${DIR}/${EXE2}.json
			Service_On
			Menu_Main
		;;
		返回主菜单)
			echo "$opt"
			Menu_M
		;;
		*)
			echo "返回主菜单"
			Menu_M
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
