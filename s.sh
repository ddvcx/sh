#!/usr/bin/env /bin/bash
export PATH=/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin:/home
source <(curl -sL http://github.com/ddvcx/sh/raw/m/ENV.sh)

EXE=sing-box
CFG="${EXE}.json"
REPO="SagerNet/${EXE}"
URL="https://github.com/$REPO"

Download(){
	Get_Tag
	TEMP
	${GET} -o "${TEMP}/${EXE}" $URL/releases/download/v${TAG}/${EXE}-${TAG}-linux-amd64.tar.gz
	UNPAK ${TEMP}/${EXE} ${TEMP}/
	mv -f ${TEMP}/*/${EXE} ${DIR}/${EXE}
	#mv -f ${DIR}_Service/${EXE}.service ${DIR}_Service/${EXE}.service
	#find ./ -name "*${EXE}*.zip" | xargs rm -rf
	CH
}

Service_Set(){
	touch ${DIR_Service}/${EXE}.service #设置服务
	cat <<EOF > ${DIR_Service}/${EXE}.service
[Unit]
After=network.target
[Service]
User=root
ExecStart="${DIR}/${EXE}" run -c "${DIR}/${CFG}"
Restart=on-failure
RestartSec=3
LimitNOFILE=infinity
[Install]
WantedBy=multi-user.target
EOF
	touch ${DIR}/${CFG} #生成配置, ${Tls}.crt ${Tls}.key
	cat <<EOF > ${DIR}/${CFG}
{
	"inbounds": [
		{
			"type": "vless",
			"listen": "::", //必须
			"listen_port": ${Port},
			"users": [{"uuid": "${Password}"}],
			"tls": {
				"enabled": true,
				"server_name": "${Domain}", //偷取证书的域名，必须tls1.3和h2
				"reality": {
					"enabled": true,
					"handshake": {
						"server": "${Domain}", //偷取证书的域名
						"server_port": ${Port}
					},
					"private_key": "xxx", //服务器私钥
					//"public_Key": "xxx", //客户端公钥，与私钥对应
					"short_id": [""] //必须
				}
			}
		}
	],
	"outbounds": [{"type": "direct"}]
}
EOF
	CH
	Service_On
}

Menu_Main(){
	PS3='请输入您的选择: '
	COLUMNS=1 #限制列数
	LINE
	select opt in ${EXE}安装 ${EXE}更新 ${EXE}卸载 ${EXE}修改设置 返回主菜单;
	do
	case $opt in
		${EXE}安装)
			echo "$opt"
			Install_Server
			Menu_Main
		;;
		${EXE}更新)
			echo "$opt"
			Update_Server
			Menu_Main
		;;
		${EXE}修改设置)
			echo "$opt"
			nano ${DIR}/${CFG}
			Service_On
			Menu_Main
		;;
		${EXE}卸载)
			echo "$opt"
			UnInstall_Server
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
