#!/usr/bin/env /bin/bash
export PATH=/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin:/home
source <(curl -sL "http://github.com/ddvcx/sh/raw/m/ENV.sh?t=$RANDOM") #&& EXE=mihomo && REPO="MetaCubeX/${EXE}" && URL="https://github.com/$REPO" && Get_Tag && TEMP && ${GET} -o "${TEMP}/${EXE}.gz" $URL/releases/download/v${TAG}/${EXE}-linux-amd64-v3-v${TAG}.gz && UNPAK ${TEMP}/${EXE}.gz ${TEMP}/

EXE=mihomo
EXE_GET=${EXE}.gz 
CFG="${EXE}.yaml"
REPO="MetaCubeX/${EXE}"
URL="https://github.com/$REPO"

Download(){
	Get_Tag
	TEMP
	${GET} -o "${TEMP}/${EXE_GET}" $URL/releases/download/v${TAG}/${EXE}-linux-amd64-v3-v${TAG}.gz
	UNPAK ${TEMP}/${EXE_GET} ${TEMP}/
	cp -fr ${TEMP}/${EXE}-linux* ${DIR}/${EXE}
	#cp -fr /home/TEMP/mihomo-linux* /home/mihomo
	#mv -f ${DIR}_Service/${EXE}.service ${DIR}_Service/${EXE}.service
	#find ./ -name "*${EXE}*.zip" | xargs rm -rf
	CH
}

Service_Set(){
	cat <<EOF > ${DIR_Service}/${EXE}.service  #设置服务
[Unit]
After=network.target
[Service]
User=root
Environment="SAFE_PATHS=/home"
ExecStart="${DIR}/${EXE}" -f "${DIR}/${CFG}"
Restart=on-failure
RestartSec=3
LimitNOFILE=infinity
[Install]
WantedBy=multi-user.target
EOF
	cat <<EOF > ${DIR}/${CFG}  #生成配置, ${Tls}.crt ${Tls}.key
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
