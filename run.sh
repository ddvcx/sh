#!/bin/bash

Line="----------------------------------------"
DIR=/home/d
DIR_Service="/etc/systemd/system"
PACKAGE=$DIR/lede/package
DATE=$(date "+%y%m%d")
Name_x=xray
Name_x2="x"

Check_Root(){
	[[ `whoami` != 'root' ]] && echo -e "请使用root权限运行" && exit 1
}

Check_NotRoot(){
	[[ `whoami` = 'root' ]] && echo -e "请不要使用root权限运行" && exit 1
}

Menu() {
	COLUMNS=1 #限制列数
	PS3='请输入您的选择: '
	echo $Line
	select opt in 编译LEDE 编译Padavan 安装依赖 修改目录权限 退出菜单;
    do case $opt in
        编译LEDE)
			echo $Line
			echo "$opt"
			bash $0 L
        ;;
        编译Padavan)
			echo $Line
			echo "$opt"
			sudo bash $0 P
        ;;
        安装依赖)
			echo $Line
			echo "$opt"
			sudo apt -y update
			sudo apt -y upgrade
			sudo apt -y net-tools ntpdate
			sudo apt -y install build-essential asciidoc binutils bzip2 gawk gettext git libncurses5-dev libz-dev patch python3 python2.7 unzip zlib1g-dev lib32gcc1 libc6-dev-i386 subversion flex uglifyjs git-core gcc-multilib p7zip p7zip-full msmtp libssl-dev texinfo libglib2.0-dev xmlto qemu-utils upx libelf-dev autoconf automake libtool autopoint device-tree-compiler g++-multilib antlr3 gperf wget curl swig rsync #安装依赖包
			sudo apt install --fix-missing
			sudo apt -y autoremove
			Menu
        ;;
		修改目录权限)
			echo $Line
			echo "$opt"
			sudo chmod 777 -R $DIR
			Menu
        ;;
        *)
			echo $Line
			echo "退出菜单"
			exit
        ;;
    esac
    done
}

LEDEMenu() {
	COLUMNS=1 #限制列数
	Check_NotRoot
	Modify() { #修改配置文件
		cd $DIR/lede
		sed -i 's@#src-git helloworld@src-git helloworld@g' feeds.conf.default
		./scripts/feeds update -a
		./scripts/feeds install -a
		#sed使用\符号作为转义符
		#sed时有特殊符号先建立变量T='${aa}'，然后调用变量${T}
		#sed使用变量用双引号，或者 单引号 双引号 ${变量} 双引号 单引号
		#sed -i 's@\(.*aa.*\)bb\(.*\)@\1cc\2@' test.txt #将aa后的bb替换为cc
		#sed -i '\@aa@{:a;n;s@cc@dd@g;\@bb@!ba}' test.txt #将aa和bb之间行的cc替换为dd
		#sed -i 's@aa@bb@g' test.txt #将aa替换为bb
		#sed -i '\@aa@cbb' test.txt #将包含的aa行替换为bb
		#sed -i 's@aa@@g' test.txt #删除aa
		#sed -i '\@aa@d' test.txt #删除包含aa的行
		#sed -i '\@aa@a\bb' test.txt #在包含aa行后增加内容为bb的行
		#sed -i '$a\aa' test.txt #在文件最后增加内容为aa的行
		#echo 'aa' test.txt #同上
		cd $PACKAGE/base-files/files/bin/ #设定时区，IP 地址
		sed -i 's@\(.*timezone.*\)UTC\(.*\)@\1CST-8\2@' config_generate
		sed -i '\@zonename@d' config_generate
		sed -i '/timezone/a\		set system.@system[-1].zonename='Asia/Shanghai'' config_generate
		sed -i 's@192.168.1.1@192.168.2.1@g' config_generate
		cd $PACKAGE/base-files/files/etc/ #修改root用户密码，连接数
		sed -i 's@\(.*root.*\):0:0\(.*\)@\1$1$/G0Vl6jX$DqhzLdsmpbAgf5Efgj7Ht0:17859:0\2@' shadow
		sed -i '\@conntrack_max@d' sysctl.conf
		echo 'net.netfilter.nf_conntrack_max=65535' >>sysctl.conf
		cd $PACKAGE/kernel/mac80211/files/lib/wifi/ #修改WIFI设置
		sed -i 's@\(.*ssid.*\)OpenWrt\(.*\)@\1D\2@' mac80211.sh
		sed -i 's@\(.*encryption.*\)none\(.*\)@\1psk2\2@' mac80211.sh
		sed -i '\@key=@d' mac80211.sh
		sed -i '/encryption/a\		set wireless.default_radio${devidx}.key=00000007' mac80211.sh
		cd $PACKAGE/lean/luci-app-sfe/root/etc/config/ #硬件加速
		sed -i 's@\(.*enabled.*\)0\(.*\)@\11\2@' sfe
		sed -i 's@\(.*option wifi.*\)0\(.*\)@\11\2@' sfe
		sed -i 's@\(.*option dns .*\)0\(.*\)@\11\2@' sfe
		sed -i 's@\(.*dns_server.*\)114.114.114.114,114.114.115.115\(.*\)@\1223.6.6.6,223.5.5.5\2@' sfe
		cd $PACKAGE/lean/luci-app-flowoffload/root/etc/config/ #硬件加速
		sed -i 's@\(.*offloading.*\)0\(.*\)@\11\2@' flowoffload
		sed -i 's@\(.*option dns .*\)0\(.*\)@\11\2@' flowoffload
		sed -i 's@\(.*dns_server.*\)114.114.114.114,114.114.115.115\(.*\)@\1223.6.6.6,223.5.5.5\2@' flowoffload
		cd $PACKAGE/feeds/helloworld/luci-app-ssr-plus/root/etc/config/ #修改 SSR
		sed -i 's@\(.*enable_switch.*\)1\(.*\)@\10\2@' shadowsocksr
		sed -i 's@\(.*auto_update.*\)1\(.*\)@\10\2@' shadowsocksr
		cd $PACKAGE/network/config/firewall/files/ #关闭 SYN-flood 防御
		sed -i 's@\(.*syn_flood.*\)1\(.*\)@\10\2@' firewall.config
	}
	PS3='请输入您的选择: '
	echo $Line
	select opt in 克隆源码 更新代码/修改配置 配置参数 编译固件IPQ4019 编译固件单线程 清理目录 修改目录权限 返回主菜单;
    do case $opt in
        克隆源码)
			echo $Line
			echo "$opt"
			cd $DIR
			git clone https://github.com/coolsnowwolf/lede
			sudo chmod 777 -R $DIR/lede
			cd $DIR/lede
			Modify
			LEDEMenu
        ;;
        更新代码/修改配置)
			echo $Line
			echo "$opt"
			cd $DIR/lede
			git fetch --all
			git reset --hard origin/master
			#git reset --hard 7a29342 # 更新指定版本
			Modify
			LEDEMenu
        ;;
        配置参数)
			echo $Line
			echo "$opt"
			echo "<*>编译软件包进固件，<m>编译软件包但不进固件"
			cd $DIR/lede
			make menuconfig
			LEDEMenu
        ;;
        编译固件IPQ4019)
			echo $Line
			echo "$opt"
			cd $DIR/lede
			cp -rf $DIR/lede/.config.ipq $DIR/lede/.config
			make defconfig #更新配置
			cp -rf $DIR/lede/.config $DIR/lede/.config.ipq
			make -j$(($(nproc) + 1)) V=s
			mv -f $DIR/lede/bin/targets/ipq40xx/generic/*ipq40*.bin $DIR/CM520-LEDE-$DATE.bin
			LEDEMenu
        ;;
        编译固件单线程)
			echo $Line
			echo "$opt"
			cd $DIR/lede
			make dirclean
			make download V=s #预下载dl库
			make -j1 V=s
			LEDEMenu
        ;;
        清理目录)
			echo $Line
			echo "$opt"
			cd $DIR/lede
			make dirclean
			LEDEMenu
        ;;
		修改目录权限)
			echo $Line
			echo "$opt"
			sudo chmod 777 -R $DIR/lede
			LEDEMenu
        ;;
        *)
			echo $Line
			echo "返回主菜单"
			Menu
        ;;
    esac
    done
}

PadavanMenu() {
	COLUMNS=1 #限制列数
	Check_Root
	Modify() { #修改配置文件
		cd $DIR/rt-n56u/trunk/configs/templates
		sed -i 's@\(.*TOOLCHAIN_DIR.*\)opt\(.*\)@\1home/d\2@' B70.config
		sed -i 's@\(.*FIRMWARE_ENABLE_UFSD.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_ENABLE_FAT.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_ENABLE_EXFAT.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_ENABLE_FUSE.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_UVC.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_SERIAL.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_AUDIO.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_QOS.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_LPRD.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_U2EC.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_SMBD.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_SMBD36.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_FTPD.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_XUPNPD.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_MINIDLNA.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_FFMPEG_NEW.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_ARIA.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_ARIA2_NEW_PREBUILD_BIN.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_ARIA_WEB_CONTROL.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_CURL.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_SCUTCLIENT.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_DOGCOM.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_MINIEAP.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_NJIT_CLIENT.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_NAPT66.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_SHADOWSOCKS.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_SSSERVER.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_SOFTETHERVPN_SERVER.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_SOFTETHERVPN_CLIENT.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_SOFTETHERVPN_CMD.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_DNSFORWARDER.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_TTYD.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_LRZSZ.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_HTOP.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_IPERF3.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_DUMP1090.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_RTL_SDR.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_SRELAY.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_MENTOHUST.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_FRPC.*\)y\(.*\)@\1n\2@' B70.config
		sed -i 's@\(.*FIRMWARE_INCLUDE_FRPS.*\)y\(.*\)@\1n\2@' B70.config
		cd $DIR/rt-n56u/trunk/user/shared #修改关闭telnet/开启ssh
		sed -i 's/\(.*telnetd.*\)1\(.*\)/\10\2/' defaults.c
		sed -i 's/\(.*sshd_enable.*\)0\(.*\)/\11\2/' defaults.c
		#修改无线设置
		sed -i 's/\(.*SYS_USER_ROOT.*\)admin\(.*\)/\1root\2/' defaults.h
		sed -i 's/\(.*DEF_WLAN_2G_CC.*\)CN\(.*\)/\1AU\2/' defaults.h
		sed -i 's/\(.*DEF_WLAN_5G_CC.*\)US\(.*\)/\1AU\2/' defaults.h
		sed -i 's/\(.*DEF_WLAN_2G_SSID.*\)BOARD_PID "_%s"\(.*\)/\1"D"\2/' defaults.h
		sed -i 's/\(.*DEF_WLAN_5G_SSID.*\)BOARD_PID "_5G_%s"\(.*\)/\1"D5"\2/' defaults.h
		sed -i 's/\(.*DEF_WLAN_2G_GSSID.*\)BOARD_PID "_GUEST_%s"\(.*\)/\1"GUEST_D"\2/' defaults.h
		sed -i 's/\(.*DEF_WLAN_5G_GSSID.*\)BOARD_PID "_GUEST_5G_%s"\(.*\)/\1"GUEST_D5"\2/' defaults.h
		sed -i 's/\(.*DEF_WLAN_2G_PSK.*\)1234567890\(.*\)/\100000007\2/' defaults.h
		sed -i 's/\(.*DEF_WLAN_5G_PSK.*\)1234567890\(.*\)/\100000007\2/' defaults.h
		sed -i 's/\(.*DEF_ROOT_PASSWORD.*\)admin\(.*\)/\1000007\2/' defaults.h
		#修改storage空间
		sed -i '\@size_etc="6M"@csize_etc="16M"' $DIR/rt-n56u/trunk/user/scripts/dev_init.sh
		sed -i 's/\(.*MTD_STORE_PART_SIZ.*\)0x200000\(.*\)/\10xE00000\2/' $DIR/rt-n56u/trunk/configs/boards/B70/kernel-3.4.x.config
	}
	PS3='请输入您的选择: '
	echo $Line
	select opt in 克隆源码 编译工具链 更新代码/修改配置 编译固件B70 修改目录权限 返回主菜单;
    do case $opt in
        克隆源码)
			echo $Line
			echo "$opt"
			mkdir $DIR
			cd $DIR
			git clone --depth=1 https://gitee.com/hanwckf/rt-n56u.git
			chmod 777 -R $DIR/rt-n56u
			cd $DIR/rt-n56u
			Modify
			PadavanMenu
        ;;
        编译工具链)
			echo $Line
			echo "$opt"
			cd $DIR/rt-n56u/toolchain-mipsel
			./clean_sources
			./clean_toolchain
			./build_toolchain
			PadavanMenu
        ;;
        更新代码/修改配置)
			echo $Line
			echo "$opt"
			cd $DIR/rt-n56u/trunk
			./clear_tree
			cd $DIR/rt-n56u
			git fetch --all
			git reset --hard origin/master
			git pull
			Modify
			PadavanMenu
        ;;
        编译固件B70)
			echo $Line
			echo "$opt"
			cd $DIR/rt-n56u/trunk
			./build_firmware_modify B70
			mv -f $DIR/rt-n56u/trunk/images/B70*.trx $DIR/B70-Padavan-$DATE.trx
			PadavanMenu
        ;;
        修改目录权限)
			echo $Line
			echo "$opt"
			chmod 777 -R $DIR/rt-n56u
			PadavanMenu
        ;;
        *)
			echo $Line
			echo "返回主菜单"
			Menu
        ;;
    esac
    done
}

if [ "$1" == "P" ] ; then
	sudo bash $0 P2
elif [ "$1" == "P2" ]; then
	PadavanMenu
elif [ "$1" == "G" ]; then
	sudo bash $0 G2
elif [ "$1" == "L" ]; then
	LEDEMenu
else
	Menu
fi