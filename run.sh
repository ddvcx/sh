#!/usr/bin/env /bin/bash
export PATH=/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin:/home

COLUMNS=1 #限制列数
DATE="$(date "+%y%m%d")"
CONF=".config"
CONF_AX6=".config.ax6"
PROXY="http://192.168.0.125:8001"
DIR="/home/d"
REP_Immortal="ImmortalWrt"
REP_URL_Immortal="https://github.com/immortalwrt/immortalwrt"
TREE_Immortal="master" #openwrt-23.05/master
DEVICE_AX6_1="ipq807x"
DEVICE_AX6_2="qualcommax"
REP_LEDE="LEDE"
REP_URL_LEDE="https://github.com/coolsnowwolf/lede"
TREE_LEDE="master"

Check_Root(){
	[[ `whoami` != 'root' ]] && echo -e "请使用root权限运行" && exit 1
}

Check_NotRoot(){
	[[ `whoami` = 'root' ]] && echo -e "请不要使用root权限运行" && exit 1
}

LINE(){
	LINE="--------------------------------------------------"
	echo "${LINE}"
}

PROXY(){
	echo "设置代理"
	http_proxy=${PROXY} && https_proxy=${PROXY}
	export http_proxy https_proxy
	curl google.com #测试网络
}

Update(){
	sudo rm -fr /var/cache/apt/ #清除缓存
	sudo apt -y update
	sudo apt -y upgrade
	sudo apt -y purge azure-cli ghc* zulu* llvm* firefox google* openjdk* mysql* php* android*
	sudo apt -y install curl git git-core wget nano net-tools ntpdate 
	sudo apt -y install libtool libtool-bin cmake gperf gawk bison xxd cpio gettext help2man pkg-config libgmp3-dev libmpc-dev libmpfr-dev libltdl-dev build-essential asciidoc binutils bzip2 libncurses5-dev libz-dev patch unzip zlib1g-dev libc6-dev-i386 subversion flex uglifyjs gcc-multilib p7zip p7zip-full rsync msmtp libssl-dev texinfo libglib2.0-dev xmlto qemu-utils libelf-dev autoconf automake  autopoint device-tree-compiler psmisc iptables jq netcat-openbsd screen socat 
	sudo apt -y install upx-ucl
	sudo apt -y autoremove && sudo apt -y autoclean && sudo apt -y clean #安装依赖包
}

DIY() { #修改配置文件
	echo "添加优惠券"
	sed -i '\@homeproxy@d' feeds.conf.default
	sed -i '$a\src-git homeproxy https://github.com/uingei/homeproxy' feeds.conf.default
	./scripts/feeds update -a
	./scripts/feeds install -a
	#sed使用\符号作为转义符，\\\表示一个\，插入多行添加换行符\n
	#sed时有特殊符号先建立变量T='${aa}'，然后调用变量${T}
	#sed禁用变量用单引号，使用变量用双引号，或者 单引号 双引号 ${变量} 双引号 单引号
	#sed -i 's@aa@bb@g' ${F} #将aa替换为bb
	#sed -i 's@\(aa\|cc\)@bb@g' ${F} #将aa或cc替换为bb
	#sed -i 's@\(.*aa.*\)bb\(.*\)@\1cc\2@' ${F} #将aa后的bb替换为cc
	#sed -i '\@aa@{:a;n;s@cc@dd@g;\@bb@!ba}' ${F} #将aa和bb之间行的cc替换为dd
	#sed -i '\@aa@cbb' ${F} #将包含的aa行替换为bb
	#sed -i 's@aa@@g' ${F} #删除aa
	#sed -i '\@aa@d' ${F} #删除包含aa的行
	#sed -i 's@aa@bb&@' ${F} #在aa前增加bb
	#sed -i 's@aa@&bb@' ${F} #在aa后增加bb
	#sed -i '\@aa@a\bb' ${F} #在包含aa行后增加bb的行
	#sed -i '$a\aa' ${F} #在末尾添加aa的行
	#echo -e 'aa' >> ${F} #同上
	echo "修改时区和默认IP"
	F=${DIR_PACKAGE}/base-files/files/bin/config_generate
	sed -i 's@\(.*timezone.*\)UTC\(.*\)@\1CST-8\2@' ${F}
	sed -i '\@zonename@d' ${F}
	sed -i '/timezone/a\		set system.@system[-1].zonename='Asia/Shanghai'' ${F}
	sed -i 's@192.168.1.1@192.168.2.1@g' ${F}
	echo "修改root密码&修改连接数"
	F=${DIR_PACKAGE}/base-files/files/etc/shadow
	sed -i '\@root@croot:$1$hQG5cKrq$UFjD3TEaLCD8B35FOw49s1:19076:0:99999:7:::' ${F}
	F=${DIR_PACKAGE}/base-files/files/etc/sysctl.conf
	sed -i '$a\net.netfilter.nf_conntrack_max=65535' ${F}
	#echo "修改CPU频率"
	#cd ${DIR}/${REP}/target/linux/ipq40xx/patches-5.4/999-ipq40xx-unlock-cpu-frequency.patch
	#sed -i 's@\(.*opp.*\)896000000\(.*\)@\1823000000\2@' ${F}
	echo "修改默认软件包"
	F=${DIR}/${REP}/include/target.mk
	sed -i 's@coremark @@g' ${F} #删除aa
	sed -i 's@ddns-scripts_aliyun @@g' ${F}
	sed -i 's@ddns-scripts_dnspod @@g' ${F}
	sed -i 's@luci-app-ddns @@g' ${F}
	sed -i 's@luci-app-autoreboot @@g' ${F}
	sed -i 's@luci-app-arpbind @@g' ${F}
	sed -i 's@luci-app-filetransfer @@g' ${F}
	sed -i 's@luci-app-vsftpd @@g' ${F}
	sed -i 's@luci-app-accesscontrol @@g' ${F}
	sed -i 's@luci-app-nlbwmon @@g' ${F}
	sed -i 's@luci-app-wol @@g' ${F}
	F=${DIR}/${REP}/target/linux/${DEVICE_AX6}/Makefile
	sed -i 's@autocore-arm @@g' ${F} #删除aa
	sed -i 's@ipv6helper @@g' ${F} #删除aa
	sed -i 's@ramdisk @@g' ${F}
	sed -i 's@htop @@g' ${F}
	sed -i 's@luci-app-cpufreq @@g' ${F}
	sed -i 's@luci-app-ipsec-vpnd @@g' ${F}
	sed -i 's@luci-app-unblockmusic @@g' ${F}
	sed -i 's@luci-app-zerotier @@g' ${F}
}

AX6(){
	#git revert 31673339464df901c9c5a70dcc8ba00953149ab1 #跳过commit
	#git reset --hard 26f363463 && make dirclean #更新指定版本
	echo "修改默认软件包"
	F=${DIR}/${REP}/target/linux/${DEVICE_AX6}/image/generic.mk
	grep "ax6" ${F} > /dev/null
	if [ $? -eq 0 ]; then
		echo "已找到 红米AX6 设备信息"
	else
		echo "未找到 红米AX6 设备信息，正在添加..."
		#curl -sLo "${DIR}/generic_ax6.mk" https://raw.githubusercontent.com/hochenchong/Actions-OpenWrt/main/ax6/generic.mk
		cp -fr ${DIR}/generic_ax6.mk ${F}
		if [ $? -eq 0 ]; then
			echo "已找到 红米AX6 设备信息"
		else
			echo "添加 红米AX6 设备信息失败"
		fi
	fi
}

CLONE(){
	LINE
	cd ${DIR}
	git clone --depth 1 -b ${TREE} ${REP_URL} ${REP} #克隆指定分支
	sudo chmod 777 -R ${DIR}/${REP}
	cd ${DIR}/${REP}
}

GIT_PULL(){ 
	git fetch origin ${TREE}
	git reset --hard
	git pull
	#git revert 31673339464df901c9c5a70dcc8ba00953149ab1 #跳过commit
	#git reset --hard 26f363463 && make dirclean #更新指定版本
}

CONFIG(){
	echo "<*>编译软件进固件，<m>编译软件但不进固件"
	cd ${DIR}/${REP}
	make menuconfig
}

MAKE_PRE(){
	LINE
	echo "准备编译"
	make defconfig #更新配置
	rm -fr ${DIR_ROM_AX6}/*
}

COPY_AX6(){
	LINE
	sleep 1
	if ls ${DIR_ROM_AX6}/*${DEVICE_AX6}*.bin 1> /dev/null 2>&1; then
		echo "编译成功"
		mv -f ${DIR_ROM_AX6}/*${DEVICE_AX6}*.bin ${DIR}/AX6_${REP}_${DATE}.bin
		mv -f ${DIR_ROM_AX6}/*${DEVICE_AX6}*.ubi ${DIR}/AX6_${REP}_${DATE}.ubi
		cp -fr ${DIR}/${REP}/${CONF_AX6} ${DIR}/${CONF_AX6}
	else
		echo "编译失败"
	fi
}


MAKE_AX6(){
	cd ${DIR}/${REP}
	if ls ${CONF_AX6} 1> /dev/null 2>&1; then
		echo "复制配置文件"
		cp -fr ${CONF_AX6} ${CONF}
	else
		echo "未找到配置文件"
	fi
	MAKE_PRE
	echo "开始编译"
	make -j$(nproc) || make -j1 || make -j1 V=s
	COPY_AX6
}

CLEAN(){
	cd ${DIR}/${REP}
	rm -fr ./build_dir/*
	make dirclean
	rm -fr ${DIR_ROM_AX6}/*
	make -j1 V=s
}

Menu() {
	COLUMNS=1 #限制列数
	PS3='请输入您的选择: '
	LINE
	select opt in Immortalwrt LEDE 安装依赖 修改目录权限 设置代理;
    do case $opt in
        Immortalwrt)
			Immortal
        ;;
        LEDE)
			LEDE
        ;;
        安装依赖)
			LINE
			sudo nano /etc/apt/sources.list
			Update
			Menu
        ;;
		修改目录权限)
			LINE
			sudo chmod 777 -R ${DIR}
			Menu
        ;;
		设置代理)
			LINE
			PROXY
			Menu
        ;;
        *)
			LINE
		echo "退出菜单"
		exit
        ;;
    esac
    done
}

Immortal() {
	Check_NotRoot
	PS3='请输入您的选择: '
	COLUMNS=1 #限制列数
	REP="${REP_Immortal}"
	REP_URL="${REP_URL_Immortal}"
	TREE="${TREE_Immortal}"
	DEVICE_AX6="${DEVICE_AX6_2}"
	DIR_PACKAGE="${DIR}/${REP}/package"
	DIR_ROM_AX6="${DIR}/${REP}/bin/targets/${DEVICE_AX6}/${DEVICE_AX6_1}"
	LINE
	select opt in 克隆源码 更新代码/修改设置 配置参数 编译AX6 编译/单线程 修改目录权限 删除目录;
    do case $opt in
        克隆源码)
			CLONE
			#AX6
			DIY
			Immortal
        ;;
        更新代码/修改设置)
			LINE
			cd ${DIR}/${REP}
			GIT_PULL
			DIY
			Immortal
        ;;
        配置参数)
			LINE
			CONFIG
			Immortal
        ;;
        编译AX6)
			LINE
			MAKE_AX6
			Immortal
        ;;
        编译/单线程)
			LINE
			CLEAN
			Immortal
        ;;
		修改目录权限)
			LINE
			sudo chmod 777 -R ${DIR}/${REP}
			Immortal
        ;;
		删除目录)
			sudo rm -fr ${DIR}/${REP}
			Menu
        ;;
        *)
			LINE
		echo "返回主菜单"
		Menu
        ;;
    esac
    done
}

LEDE() {
	Check_NotRoot
	PS3='请输入您的选择: '
	COLUMNS=1 #限制列数
	REP="${REP_LEDE}"
	REP_URL="${REP_URL_LEDE}"
	TREE="${TREE_LEDE}"
	DEVICE_AX6="${DEVICE_AX6_1}"
	DIR_PACKAGE="${DIR}/${REP}/package"
	DIR_ROM_AX6="${DIR}/${REP}/bin/targets/${DEVICE_AX6_1}/generic"
	LINE
	select opt in 克隆源码 更新代码/修改设置 配置参数 编译AX6 编译/单线程 修改目录权限 删除目录;
    do case $opt in
        克隆源码)
			CLONE
			AX6
			DIY
			LEDE
        ;;
        更新代码/修改设置)
			LINE
			cd ${DIR}/${REP}
			GIT_PULL
			AX6
			DIY
			LEDE
        ;;
        配置参数)
			LINE
			CONFIG
			LEDE
        ;;
        编译AX6)
			LINE
			MAKE_AX6
			LEDE
        ;;
        编译/单线程)
			LINE
			CLEAN
			make -j1 V=s
			LEDE
        ;;
		修改目录权限)
			LINE
			sudo chmod 777 -R ${DIR}/${REP}
			LEDE
        ;;
		删除目录)
			sudo rm -fr ${DIR}/${REP}
			Menu
        ;;
        *)
			LINE
		echo "返回主菜单"
		Menu
        ;;
    esac
    done
}

if [ "$1" == "P" ] ; then
	sudo bash $0 P2
elif [ "$1" == "LEDE" ]; then
	LEDE
elif [ "$1" == "ImmortalWrt" ]; then
	Immortal
else
	Menu
fi
