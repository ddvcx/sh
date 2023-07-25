#!/usr/bin/env /bin/bash
export PATH=/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin:/home
source <(curl -sL http://github.com/ddvcx/sh/raw/m/ENV.sh)

EXE=hysteria
REPO="apernet/$EXE"
URL="https://github.com/$REPO"

Download(){
	Get_Tag
	curl -sLo "$EXE" $URL/releases/download/v${TAG}/${EXE}-linux-amd64
	tar -xvf $EXE #xvf(xz)/zxvf(gz)
	mv -f $EXE $DIR/$EXE
	#mv -f $DIR_Service/$EXE.service $DIR_Service/$EXE.service
	find ./ -name "*$EXE*" | xargs rm -rf
	CH
}

Service_Set(){
	touch $DIR_Service/$EXE.service #设置服务
	cat <<EOF > $DIR_Service/$EXE.service
[Unit]
After=network.target
[Service]
User=root
ExecStart="$DIR/$EXE" -c "$DIR/$EXE.json" server
Restart=on-failure
RestartSec=3
[Install]
WantedBy=multi-user.target
EOF
	touch $DIR/$EXE.json #生成配置, $Tls.crt $Tls.key
	cat <<EOF > $DIR/$EXE.json
{
  "listen": ":$Port",
  //"protocol": "faketcp", //udp/wechat-video/faketcp/默认udp
  "cert": "$Tls.crt",
  "key": "$Tls.key",
  "auth": {
    "mode": "passwords",
    "config": ["$Password"]
  }
}
EOF
	sysctl -w net.core.rmem_max=16777216  #增加UDP buffer大小
	sysctl -w net.core.wmem_max=16777216
	iptables -t nat -A PREROUTING -i eth0 -p udp --dport 30000:45000 -j DNAT --to-destination :$Port #多端口IPv4
	#ip6tables -t nat -A PREROUTING -i eth0 -p udp --dport 30000:45000 -j DNAT --to-destination :$Port #多端口IPv6
	CH
	Service_On
}

UnInstall_Server(){
	echo -e "正在卸载 ... "
	Service_Off
	killall -9 $EXE >/dev/null 2>&1
	rm -fr $DIR/$EXE* >/dev/null 2>&1
	rm -fr $DIR_Service/$EXE.service >/dev/null 2>&1
	rm -fr /var/log/$EXE /etc/init.d/$EXE /usr/local/etc/$EXE >/dev/null 2>&1
	iptables -t nat -D PREROUTING 1 #清除多端口转发
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