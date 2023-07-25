#!/usr/bin/env /bin/bash
export PATH=/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin:/home

DIR="/home"
DIR_Service="/etc/systemd/system"
LINE="---------------------------------------"
OS=""
OS_Ver=""
OS_Bit=""
INS=""
UNS=""
Domain=""
Domain_Main=""
Port=""
Password=""
TAG=""
GET="curl -L"

Check_Root(){
	[[ `whoami` != 'root' ]] && echo -e "请使用root权限运行" && exit 1
}

Check_NotRoot(){
	[[ `whoami` = 'root' ]] && echo -e "请不要使用root权限运行" && exit 1
}

Check_OS(){
	if [[ -s /etc/redhat-release ]]; then
		OS_Ver=`grep -oE  "[0-9.]+" /etc/redhat-release | cut -d . -f 1`
	else
		OS_Ver=`grep -oE  "[0-9.]+" /etc/issue | cut -d . -f 1`
	fi
	OS_Bit=`uname -m`
	if [[ ${OS_Bit} = "x86_64" ]]; then
		OS_Bit="x64"
	else
		OS_Bit="x32"
	fi
	echo ${LINE}
	if cat /etc/issue | grep -q -E -i "debian"; then
		OS="debian"
		INS="apt -y"
		UNS="purge"
		echo "当前系统为 ${OS} ${OS_Ver} ${OS_Bit}"
	elif cat /etc/issue | grep -q -E -i "ubuntu"; then
		OS="ubuntu"
		INS="apt -y"
		UNS="purge"
		echo "当前系统为 ${OS} ${OS_Ver} ${OS_Bit}"
	else
		echo "不支持的系统"
    fi
}

Check_BBR(){ #检查安装BBR的系统要求
	if [[ "${OS}" == "debian" ]]; then
		if [[ ${OS_Ver} -ge "8" ]]; then
			Menu_Main
		else
			echo -e "BBR内核不支持当前系统 ${OS} ${OS_Ver} ${OS_Bit} !" && exit 1
		fi
	elif [[ "${OS}" == "ubuntu" ]]; then
		if [[ ${OS_Ver} -ge "14" ]]; then
			Menu_Main
		else
			echo -e "BBR内核不支持当前系统 ${OS} ${OS_Ver} ${OS_Bit} !" && exit 1
		fi
	else
		echo -e "BBR内核不支持当前系统 ${OS} ${OS_Ver} ${OS_Bit} !" && exit 1
	fi
}

Check_BBR(){
	Kernel_Ver=`uname -r | awk -F "-" '{print $1}'`
	if [[ `echo ${Kernel_Ver} | awk -F'.' '{print $1}'` == "4" ]] && [[ `echo ${Kernel_Ver} | awk -F'.' '{print $2}'` -ge 9 ]] || [[ `echo ${Kernel_Ver} | awk -F'.' '{print $1}'` == "5" ]]; then
		Kernel_Status="BBR"
	else 
		Kernel_Status="noinstall"
	fi
	if [[ ${Kernel_Status} == "BBR" ]]; then
		BBR=$(sysctl net.ipv4.tcp_congestion_control | awk '{print $3}')
		if [[ "$BBR" == "bbr" ]]; then
			BBR="BBR已开启"
		else
			BBR="BBR未开启"
		fi
	fi
}

CH(){ #设置权限
	chmod -R 777 ${DIR} >/dev/null 2>&1
	chmod -R 777 ${DIR_Service} >/dev/null 2>&1
}

TMP(){ #临时目录
	TMP=${DIR}/tmp
	rm -fr ${TMP}
	mkdir ${TMP}
	echo -e "设置临时目录：${TMP}"
}

Domain_Check(){ #检查域名变量
	if [ ${Domain} ] ;then
		echo "域名已设置为：${Domain}"
	else
		Domain_Set
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
		echo -e "域名设置成功"
		Tls="${DIR}/${Domain}"
		# F参数定义分隔符(默认空格)，NR第1行，substr第2列，1-3个字符，$NF为最后列
		Domain_Main=$(echo "${Domain}" | awk -F '.' 'NR<=1 {print $(NF-1)"."$NF}')
	fi
}

Port_Check(){ #检查密码变量
	if [ ${Port} ] ;then
		echo "端口已设置为：${Port}"
	else
		Port_Set
	fi
}

Port_Set(){ #设置端口
	echo -e "请设置端口"
	stty erase '^H' && read -e -p "请输入：" Port
	[[ -z ${Port} ]] && Port="none"
	if [ "${Port}" = "none" ] ;then
		echo -e "请正确输入端口"
		Port_Set
	else
		echo -e "端口设置成功"
	fi
}

Password_Check(){ #检查密码变量
	if [ ${Password} ] ;then
		echo "密码已设置为：${Password}"
	else
		Password_Set
	fi
}

Password_Set(){ #设置密码
	echo -e "请设置密码"
	stty erase '^H' && read -e -p "请输入：" Password
	[[ -z ${Password} ]] && Password="none"
	if [ "${Password}" = "none" ] ;then
		echo -e "请正确输入密码"
		Password_Set
	else
		echo -e "密码设置成功"
	fi
}

Install_Pre(){ #安装依赖
	clear
	${INS} update
	${INS} upgrade
	${INS} install curl iptables iptables-persistent jq nano net-tools netcat ntpdate screen socat unzip wget xz-utils
	${INS} --fix-broken install
	${INS} ${UNS} *vim* *apache*
	${INS} autoremove
	File=/etc/ssh/sshd_config && sed -i '\#PermitRootLogin #cPermitRootLogin yes' $File && sed -i '\#Port #cPort 222' $File && sed -i '\#ClientAliveInterval #cClientAliveInterval 30' $File && sed -i '\#ClientAliveCountMax #cClientAliveCountMax 60' $File && service ssh restart #修改SSH端口和ROOT登录
}

Time_Sync(){ #同步服务器时间
	cp -f /usr/share/zoneinfo/Asia/Shanghai /etc/localtime #修改时区
	systemctl stop ntp &>/dev/null
	echo -e "正在进行时间同步"
	ntpdate pool.ntp.org
	if [[ $? -eq 0 ]];then 
		echo -e "时间同步成功，当前系统时间 `date -R`"
	else
		echo -e "时间同步失败，请检查 NTPdate 服务是否正常工作"
	fi 
}

Service_On(){ #重载服务
	systemctl daemon-reload
	systemctl enable ${EXE2}.service
	systemctl restart ${EXE2}
	sleep 1
	systemctl --no-pager status ${EXE2}
}

Service_Off(){ #禁用服务
	systemctl stop ${EXE2} >/dev/null 2>&1
	systemctl disable ${EXE2} >/dev/null 2>&1
	systemctl daemon-reload
}

Show_Status(){ #显示信息
	echo -e "您设置的域名为：${Domain}，主域名为：${Domain_Main}"
	echo -e "您设置的端口为：${Port}"
	if [ ${Password} ] ;then
		echo -e "您设置的密码为：${Password}"
	else
		echo -e ""
	fi
}

Menu_M(){ #主菜单
	bash <(${GET} http://raw.githubusercontent.com/ddvcx/sh/m/c.sh)
}

Get_Tag(){ #获取版本号
	TAG=$(${GET} https://api.github.com/repos/$REPO/releases | grep "tag_name" | head -n 1 | awk -F ":" '{print $2}' | sed 's/\"//g;s/,//g;s/ //g;s/v//g')
	#TAG=$(curl -sL https://api.github.com/repos/caddyserver/caddy/releases/latest | grep "tag_name" | head -n 1 | awk -F ":" '{print $2}' | sed 's/\"//g;s/,//g;s/ //g;s/v//g') && echo ${TAG}
	echo "准备安装${EXE2}-${TAG} "
}
