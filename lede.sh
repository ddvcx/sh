	DEVICE="qualcommax"
	echo "修改时区和默认IP"
	F=package/base-files/files/bin/config_generate
	sed -i 's@\(.*timezone.*\)UTC\(.*\)@\1CST-8\2@' ${F}
	sed -i '\@zonename@d' ${F}
	sed -i '/timezone/a\		set system.@system[-1].zonename='Asia/Shanghai'' ${F}
	sed -i 's@192.168.1.1@192.168.2.1@g' ${F}
	echo "修改root密码&修改连接数"
	F=package/base-files/files/etc/shadow
	sed -i '\@root@croot:$5$qrorSL36WFuDIQd7$.sEj1fQYpWirw3rO/7R8flwtEyOVv5KSXCDTN7r8GY9:20454:0:99999:7:::' ${F}
	F=package/base-files/files/etc/sysctl.conf
	sed -i '$a\net.netfilter.nf_conntrack_max=65535' ${F}
	echo "修改默认软件包"
	F=include/target.mk
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
	F=target/linux/${DEVICE}/Makefile
	sed -i 's@autocore-arm @@g' ${F} #删除aa
	sed -i 's@ipv6helper @@g' ${F} #删除aa
	sed -i 's@ramdisk @@g' ${F}
	sed -i 's@htop @@g' ${F}
	sed -i 's@luci-app-cpufreq @@g' ${F}
	sed -i 's@luci-app-ipsec-vpnd @@g' ${F}
	sed -i 's@luci-app-unblockmusic @@g' ${F}
	sed -i 's@luci-app-zerotier @@g' ${F}
