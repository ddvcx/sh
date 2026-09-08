#!/usr/bin/env /bin/bash
export PATH=/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin:/home

DATE="$(date +%y%m%d)"
DIR="/home"
DIR_Service="/etc/systemd/system"
OS=""
OS_Ver=""
OS_Bit=""
INS=""
UNS=""
Domain=""
Domain_Main=""
Port=""
TAG=""
GET="curl -sL"

BAK(){
	mkdir ${DIR}/bak
	cp -f ${DIR}/data ${DIR}/bak/
	cp -f ${DIR}/nginx/*.conf ${DIR}/bak/
	cp -f ${DIR}/*.conf ${DIR}/bak/
	cp -f ${DIR}/*.json ${DIR}/bak/
	cp -f ${DIR}/*.yaml ${DIR}/bak/
}

BAK_R(){
	cp -f ${DIR}/bak/* ${DIR}/
}

Check_Root(){
	[[ `whoami` != 'root' ]] && echo -e "请使用root权限运行" && exit 1
}

Check_NotRoot(){
	[[ `whoami` = 'root' ]] && echo -e "请不要使用root权限运行" && exit 1
}

Check_OS(){
	if [[ -f /etc/os-release ]]; then
		. /etc/os-release
		OS=$ID
		OS_Ver=${VERSION_ID%%.*}
	elif [[ -s /etc/redhat-release ]]; then
		OS="centos"
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
	if [[ ${OS} == "debian" || ${OS} == "ubuntu" ]]; then
		INS="apt -y"
		UNS="purge"
		echo "当前系统为 ${OS} ${OS_Ver} ${OS_Bit}"
	else
		echo "不支持的系统"
		exit 1
	fi
}

Check_BBR(){
	Kernel_Ver=$(uname -r | awk -F "-" '{print $1}')  # 获取内核版本
	Kernel_Main=$(echo ${Kernel_Ver} | awk -F'.' '{print $1}')  # 主版本号
	Kernel_Sub=$(echo ${Kernel_Ver} | awk -F'.' '{print $2}')  # 次版本号
	if { [[ "$Kernel_Main" -eq 4 && "$Kernel_Sub" -ge 9 ]] || [[ "$Kernel_Main" -ge 5 ]]; }; then
		Kernel_Status="支持 BBR"
	else
		Kernel_Status="不支持 BBR"
	fi
	if [[ ${Kernel_Status} == "支持 BBR" ]]; then  # 这里改成“支持 BBR”
		BBR=$(sysctl net.ipv4.tcp_congestion_control | awk -F'= ' '{print $2}')
		if [[ "$BBR" == "bbr" ]]; then
			BBR="已启用 BBR"
		else
			BBR="未启用 BBR"
		fi
	else
		BBR="不支持，无法启用"
	fi
	echo "内核状态: $Kernel_Status"
	echo "BBR状态: $BBR"
}

CH(){ #设置权限
	chmod -R 777 ${DIR} >/dev/null 2>&1
	chmod -R 777 ${DIR_Service} >/dev/null 2>&1
}

CLEAN(){
	TEMP
	echo -e "清理残留中..."
	rm -f ${DIR}/${EXE}* >/dev/null 2>&1
	rm -fr ${DIR_Service}/${EXE}* >/dev/null 2>&1
	rm -fr ${DIR}/log/* ${DIR}/${TEMP}/* >/dev/null 2>&1
	rm -fr /var/log/* /etc/init.d/${EXE}* /usr/local/etc/${EXE}* >/dev/null 2>&1
	echo -e "清理完成"
}

Domain_Set(){ #输入域名
	echo -e "请输入域名: "
	while true; do
		stty erase '^H' && read -e -p "请输入：" Domain
		[[ -z ${Domain} ]] && Domain="none"
		if [ "${Domain}" = "none" ] ;then
			echo -e "请正确输入域名"
			continue
		else
			echo -e "域名设置成功"
			Tls="${DIR}/${Domain}"
			if [[ "${Domain}" =~ \.(com|net|org|gov|edu)\.[a-zA-Z]{2}$ ]]; then
				Domain_Main=$(echo "${Domain}" | awk -F '.' '{print $(NF-2)"."$(NF-1)"."$NF}')
			else
				Domain_Main=$(echo "${Domain}" | awk -F '.' '{print $(NF-1)"."$NF}')
			fi
			break
		fi
	done
}

DY(){ #延迟
	sleep 1
}

Get_Tag(){ #获取版本号
	TAG=$(${GET} https://api.github.com/repos/$REPO/releases/latest | grep "tag_name" | head -n 1 | awk -F ":" '{print $2}' | sed 's/\"//g;s/,//g;s/ //g;s/v//g')
	#TAG=$(curl -s https://api.github.com/repos/XXX/XXX/releases/latest | grep "tag_name" | head -n 1 | awk -F ":" '{print $2}' | sed 's/\"//g;s/,//g;s/ //g;s/v//g') && echo ${TAG}
	echo "准备安装${EXE}-${TAG} "
}

Install_Pre(){ #安装依赖
	clear
	export DEBIAN_FRONTEND=noninteractive #禁止弹出交互式问题
	${INS} update
	${INS} upgrade
	for pkg in p7zip-full curl git htop iptables iptables-persistent jq make nano net-tools netcat-openbsd ntpdate screen socat upx wget xz-utils; do
		${INS} install "$pkg" || echo "跳过失败: $pkg"
	done
	${INS} --fix-broken install
	${INS} ${UNS} *vim* *apache*
	${INS} autoremove
	File=/etc/ssh/sshd_config && sed -i '\#PermitRootLogin #cPermitRootLogin yes' $File && sed -i '\#Port #cPort 22' $File && sed -i '\#ClientAliveInterval #cClientAliveInterval 30' $File && sed -i '\#ClientAliveCountMax #cClientAliveCountMax 60' $File && service ssh restart #修改SSH端口和ROOT登录
	export EDITOR=nano #修改默认编辑器
}

Install_Server(){
	clear
	UnInstall_Server
	Download
	Service_Set
	Service_On
	echo -e "安装完成"
}

LINE(){
	echo "---------------------------------------"
}

Menu_M(){ #主菜单
	bash <(${GET} http://raw.githubusercontent.com/ddvcx/sh/m/c.sh)
}

Service_On(){ #重载服务
	pkill -9 ${EXE}
	systemctl daemon-reload
	systemctl enable ${EXE}.service
	systemctl restart ${EXE}
	DY
	systemctl -l --no-pager status ${EXE}
}

Service_Off(){ #停止服务
	pkill -9 ${EXE}
	systemctl stop ${EXE} >/dev/null 2>&1
	systemctl disable ${EXE} >/dev/null 2>&1
	systemctl daemon-reload
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

TEMP(){ #临时目录
	TEMP=${DIR}/TEMP
	rm -fr ${TEMP}
	mkdir ${TEMP}
	chmod -R 777 ${TEMP} >/dev/null 2>&1
	echo -e "设置临时目录：${TEMP}"
}

UnInstall_Server(){
	echo -e "卸载服务中... "
	Service_Off
	killall -9 ${EXE} >/dev/null 2>&1
	CLEAN
	echo -e "Server 卸载完成"
}

Update_Server(){
	EXE_File="${DIR}/${EXE}"
	echo -e "正在更新${EXE}"
	BAK
	UnInstall_Server
	Download
	Service_Set
	BAK_R
	Service_On
	echo -e "更新完成"
}

PAK() { #压缩，PAK 源文件 目标文件
    [[ $# -lt 2 ]] && { echo "Usage: PAK <src...> <dest>"; return 1; }
    local cmd; if command -v 7za >/dev/null 2>&1; then cmd=7za; elif command -v 7z >/dev/null 2>&1; then cmd=7z; else echo "PAK Err: 请先安装 p7zip-full"; return 1; fi
    local dest="${@: -1}" abs_dest first_src base_dir tmp
    local srcs=("${@:1:$#-1}")
    mkdir -p "$(dirname "$dest")"
    abs_dest="$(cd "$(dirname "$dest")" && pwd)/$(basename "$dest")"
    first_src="${srcs[0]%/}"
    base_dir="$(cd "$(dirname "$first_src")" && pwd)"
    tmp="$abs_dest.tar"
    (
        cd "$base_dir" || return 1
        local rel_srcs=() f abs_f
        for f in "${srcs[@]}"; do
            [[ ! -e "$f" ]] && continue
            [[ "$f" == /* ]] && abs_f="$f" || abs_f="$(cd "$(dirname "$f")" && pwd)/$(basename "$f")"
            abs_f="${abs_f%/}"
            if [[ "$abs_f" == "$base_dir" ]]; then rel_srcs+=("."); elif [[ "$abs_f" == "$base_dir"/* ]]; then rel_srcs+=("${abs_f#$base_dir/}"); else rel_srcs+=("$abs_f"); fi
        done
        [[ ${#rel_srcs[@]} -eq 0 ]] && { echo "PAK Err: 源文件不存在或路径错误"; return 1; }
        local t=""
        case "${dest,,}" in
            *.tar.gz|*.tgz)   t="-tgzip" ;;
            *.tar.bz2|*.tbz2) t="-tbzip2" ;;
            *.tar.xz)         t="-txz" ;;
            *.tar)            "$cmd" a -ttar "$abs_dest" "${rel_srcs[@]}" >/dev/null ;;
            *.zip)            "$cmd" a -tzip "$abs_dest" "${rel_srcs[@]}" >/dev/null ;;
            *.7z)             "$cmd" a "$abs_dest" "${rel_srcs[@]}" >/dev/null ;;
            *.gz)             [[ ${#rel_srcs[@]} -gt 1 || -d "${rel_srcs[0]}" ]] && return 1; "$cmd" a -tgzip "$abs_dest" "${rel_srcs[0]}" >/dev/null ;;
            *) return 1 ;;
        esac
        if [[ -n "$t" ]]; then
            "$cmd" a -ttar "$tmp" "${rel_srcs[@]}" >/dev/null && "$cmd" a "$t" "$abs_dest" "$tmp" >/dev/null
            rm -f "$tmp"
        fi
        if [[ -f "$abs_dest" ]]; then echo "已打包：$abs_dest"; else echo "PAK Err: 打包失败，未生成 $abs_dest"; return 1; fi
    )
}

UNPAK() {  #解压缩文件，使用 p7zip，UNPAK 源文件 目标文件
    local f="$1" d="${2:-.}"
    [[ ! -f "$f" ]] && { echo "Err: '$f' 不存在"; return 1; }
    [[ "$d" != "." ]] && mkdir -p "$d"
    if 7z x -y "$f" -o"$d" >/dev/null 2>&1; then
        return 0
    else
        tar -xf "$f" -C "$d" 2>/dev/null && return 0
        echo "Err: 解压失败 (p7zip 无法处理解压)"
        return 1
    fi
}
