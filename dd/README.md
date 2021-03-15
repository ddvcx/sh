	转自萌咖Blog, https://moeclub.org/2018/04/03/603/

	全自动安装默认root密码: 
	MoeClub.org
	能够全自动重装Debian/Ubuntu/CentOS/windows等系统
	同时提供dd安装镜像功能,例如: 全自动无救援dd安装windows系统
	全自动安装CentOS时默认提供VNC功能,可使用VNC Viewer查看进度
	VNC端口为1或者5901,可自行尝试连接(成功后VNC功能会消失)
	目前CentOS系统只支持任意版本重装为 CentOS 6.x 及以下版本
	特别注意:OpenVZ构架不适用

	#安装依赖:
	Debian/Ubuntu:
	apt-get install -y xz-utils openssl gawk file
	RedHat/CentOS:
	yum install -y xz openssl gawk file

	#快速安装系统
	bash <(wget --no-check-certificate -qO- 'http://raw.githubusercontent.com/ddvcx/sh/master/dd/dd.sh') -u 18.04 -v 64 -a
	bash <(wget --no-check-certificate -qO- 'http://raw.githubusercontent.com/ddvcx/sh/master/dd/dd.sh') -d 10 -v 64 -a

	使用说明:
	bash dd.sh -d/--debian [dist-name]
    			      -u/--ubuntu [dist-name]
    			      -c/--centos [dist-version]
    			      -v/--ver [32/i386|64/amd64]
    			      --ip-addr/--ip-gate/--ip-mask
    			      -apt/-yum/--mirror
    			      -dd/--image
    			      -a/-m
	dist-name: 发行版本代号
	dist-version: 发行版本号
	-apt/-yum/--mirror : 使用定义镜像
	-a/-m : 询问是否能进入VNC自行操作. -a 为不提示(一般用于全自动安装), -m 为提示

	使用默认镜像全自动安装
	bash dd.sh -d 8 -v 64 -a
	使用自定义镜像全自动安装
	bash dd.sh -c 6.10 -v 64 -a --mirror 'http://mirror.centos.org/centos'
	bash dd.sh -d 10 -v 64 -a --mirror 'http://cdimage.debian.org/cdimage/archive/'
	bash dd.sh -u Bionic -v 64 -a --mirror 'http://old-releases.ubuntu.com/releases/'

	以下示例中,将X.X.X.X替换为自己的网络参数
	--ip-addr :IP Address/IP地址
	--ip-gate :Gateway   /网关
	--ip-mask :Netmask   /子网掩码

	使用自定义镜像全自动安装
	bash dd.sh -d 9 -v 64 -a --mirror 'http://mirrors.ustc.edu.cn/debian/'

	使用自定义镜像自定义网络参数全自动安装
	bash dd.sh -u 16.04 -v 64 -a --ip-addr x.x.x.x --ip-gate x.x.x.x --ip-mask x.x.x.x --mirror 'http://archive.ubuntu.com/ubuntu'

	使用自定义网络参数全自动dd方式安装
	bash dd.sh --ip-addr x.x.x.x --ip-gate x.x.x.x --ip-mask x.x.x.x -dd 'https://moeclub.org/onedrive/IMAGE/Windows/win7emb_x86.tar.gz'

	使用自定义网络参数全自动dd方式安装存储在谷歌网盘中的镜像
	bash dd.sh --ip-addr x.x.x.x --ip-gate x.x.x.x --ip-mask x.x.x.x -dd "https://image.moeclub.org/GoogleDrive/1cqVl2wSGx92UTdhOxU9pW3wJgmvZMT_J"

	国内推荐使用USTC源
	--mirror 'http://mirrors.ustc.edu.cn/debian/'

	一些可用镜像地址:
	推荐使用带有 /GoogleDrive/ 链接, 速度更快
	当然也可以使用自己GoogleDrive中储存的镜像,使用方式:
	https://image.moeclub.org/GoogleDrive/

	win7emb_x86.tar.gz:
	https://moeclub.org/onedrive/IMAGE/Windows/win7emb_x86.tar.gz

	win10ltsc_x64.tar.gz:
	https://moeclub.org/onedrive/IMAGE/Windows/win10ltsc_x64.tar.gz

	一些提示:
	萌咖提供的dd安装镜像
	远程登陆账号为: Administrator
	远程登陆密码为: Vicer
	仅修改了主机名,可放心使用.(建议自己制作.)
	在dd安装系统镜像时:
	在你的机器上全新安装,如果你有VNC,可以看到全部过程
	在dd安装镜像的过程中,不会走进度条(进度条一直显示为0%).完成后将会自动重启
	分区界面标题一般显示为: "Starting up the partitioner"
	使用谷歌网盘中储存的镜像: [无限制大小] 获取谷歌网盘文件临时直接下载链接
	在全自动安装CentOS时:
	如果看到 "Starting graphical installation" 或者类似表达,则表示正在安装
	正常情况下只需要耐心等待安装完成即可
	如果需要查看进度,使用VNC Viewer(或者其他VNC连接工具)
	连接提示中的IP地址:端口进行连接.(端口一般为1或者5901

	声明:
	各种形式的翻译或转载需注明作者及本文地址
	使用该脚本造成的任何直接损失或间接损失,萌咖不负任何责任
