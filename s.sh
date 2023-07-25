#!/usr/bin/env /bin/bash
export PATH=/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin:/home
source <(curl -sL http://github.com/ddvcx/sh/raw/m/ENV.sh)

EXE=shadowsocks
REPO="shadowsocks/shadowsocks-rust"
URL="https://github.com/$REPO"
EXE2=v2ray-plugin
REPO2="$EXE/$EXE2"
URL2="https://github.com/$REPO2"

Download(){
	Get_Tag
	curl -sLo "$EXE" $URL/releases/download/v${TAG}/${EXE}-v${TAG}.x86_64-unknown-linux-musl.tar.xz
	curl -sLo "$EXE2" $URL2/releases/download/v${TAG2}/${EXE2}-linux-amd64-v${TAG2}.tar.gz
	tar -xvf $EXE #xvf(xz)/zxvf(gz)
	tar -zxvf $EXE2
	mv -f ssserver $DIR/$EXE
	mv -f ${EXE2}_linux_amd64 $DIR/$EXE2
	rm -fr sslocal ssmanager ssserver ssservice ssurl >/dev/null 2>&1
	find ./ -name "${EXE2}*" | xargs rm -rf
	CH
}

Service_Set(){
	touch $DIR_Service/$EXE.service #设置服务
	cat <<EOF > $DIR_Service/$EXE.service
[Unit]
After=network.target
[Service]
User=root
ExecStart="$DIR/$EXE" -c "$DIR/$EXE.json"
Restart=on-failure
RestartSec=3
[Install]
WantedBy=multi-user.target
EOF
	touch $DIR/$EXE.json #生成配置, $Tls.crt $Tls.key
	cat <<EOF > $DIR/$EXE.json
{
    "server": "::",
    "server_port": $Port,
    "method": "aes-128-gcm",
    "password": "$Password",
    "mode": "tcp_and_udp",
    "plugin": "$DIR/v2ray-plugin",
    "plugin_opts": "server;mode=websocket;mux=0;path=/test",
    "fast_open": true
}
EOF
	CH
	Service_On
}

UnInstall_Server(){
	echo -e "正在卸载 ... "
	Service_Off
	killall -9 $EXE >/dev/null 2>&1
	rm -fr $DIR/$EXE* $DIR/$EXE2* >/dev/null 2>&1
	rm -fr $DIR_Service/$EXE.service >/dev/null 2>&1
	rm -fr /var/log/$EXE /etc/init.d/$EXE /usr/local/etc/$EXE >/dev/null 2>&1
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
	Show_Status
	Service_On
}

Update_Server(){
	File_X="$DIR/$EXE"
	if [ ! -f $File_X ]; then
		echo -e "$EXE没有安装，开始安装"
		Install_Server
	else
		echo -e "正在更新$EXE"
		mv -f $DIR/$EXE.json $DIR/bak
		UnInstall_Server
		Download
		Service_Set
		mv -f $DIR/bak $DIR/$EXE.json
		echo -e "更新完成"
	fi
}

Menu_Main(){
	PS3='请输入您的选择: '
	echo ${LINE}
	COLUMNS=1 #限制列数
	select opt in $EXE安装 $EXE更新 $EXE卸载 $EXE修改设置 返回主菜单;
	do
	case $opt in
		$EXE安装)
			echo "$opt"
			Install_Server
			Menu_Main
		;;
		$EXE更新)
			echo "$opt"
			Update_Server
			Menu_Main
		;;
		$EXE卸载)
			echo "$opt"
			UnInstall_Server
			Menu_Main
		;;
		$EXE修改设置)
			echo "$opt"
			nano $DIR/$EXE.json
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
