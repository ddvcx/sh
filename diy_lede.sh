#!/bin/bash

#修改时区，IP 地址
sed -i 's@\(.*timezone.*\)UTC\(.*\)@\1CST-8\2@' package/base-files/files/bin/config_generate
sed -i '\@zonename@d' package/base-files/files/bin/config_generate
sed -i '/timezone/a\		set system.@system[-1].zonename='Asia/Shanghai'' package/base-files/files/bin/config_generate
sed -i 's@192.168.1.1@192.168.2.1@g' package/base-files/files/bin/config_generate
#修改root用户密码，连接数
sed -i 's@\(.*root.*\):0:0\(.*\)@\1$1$/G0Vl6jX$DqhzLdsmpbAgf5Efgj7Ht0:17859:0\2@' package/base-files/files/etc/shadow
sed -i '\@conntrack_max@d' package/base-files/files/etc/sysctl.conf
echo 'net.netfilter.nf_conntrack_max=65535' >>package/base-files/files/etc/sysctl.conf
#修改WIFI设置
sed -i 's@\(.*ssid.*\)OpenWrt\(.*\)@\1D\2@' package/kernel/mac80211/files/lib/wifi/mac80211.sh
sed -i 's@\(.*encryption.*\)none\(.*\)@\1psk2\2@' package/kernel/mac80211/files/lib/wifi/mac80211.sh
sed -i '\@key=@d' package/kernel/mac80211/files/lib/wifi/mac80211.sh
sed -i '/encryption/a\set wireless.default_radio${devidx}.key=00000007' package/kernel/mac80211/files/lib/wifi/mac80211.sh
#硬件加速
sed -i 's@\(.*enabled.*\)0\(.*\)@\11\2@' package/lean/luci-app-sfe/root/etc/config/sfe
sed -i 's@\(.*option wifi.*\)0\(.*\)@\11\2@' package/lean/luci-app-sfe/root/etc/config/sfe
sed -i 's@\(.*option dns .*\)0\(.*\)@\11\2@' package/lean/luci-app-sfe/root/etc/config/sfe
sed -i 's@\(.*dns_server.*\)114.114.114.114,114.114.115.115\(.*\)@\1223.6.6.6,223.5.5.5\2@' package/lean/luci-app-sfe/root/etc/config/sfe
#硬件加速
sed -i 's@\(.*offloading.*\)0\(.*\)@\11\2@' package/lean/luci-app-flowoffload/root/etc/config/flowoffload
sed -i 's@\(.*option dns.*\)0\(.*\)@\11\2@' package/lean/luci-app-flowoffload/root/etc/config/flowoffload
sed -i 's@\(.*dns_server.*\)114.114.114.114,114.114.115.115\(.*\)@\1223.6.6.6,223.5.5.5\2@' package/lean/luci-app-flowoffload/root/etc/config/flowoffload
#修改 SSR
sed -i 's@\(.*enable_switch.*\)1\(.*\)@\10\2@' package/feeds/helloworld/luci-app-ssr-plus/root/etc/config/shadowsocksr
sed -i 's@\(.*auto_update.*\)1\(.*\)@\10\2@' package/feeds/helloworld/luci-app-ssr-plus/root/etc/config/shadowsocksr
#关闭 SYN-flood 防御
sed -i 's@\(.*syn_flood.*\)1\(.*\)@\10\2@' package/network/config/firewall/files/firewall.config
