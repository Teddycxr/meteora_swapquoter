# meteora_swapquoter
主要用来进行meteora的DYN 和 DLMM 询价,Docker 安装ts环境，python进行url请求

How to use：

1. docker build --no-cache -t meteora_swapquoter .
2. docker run -p 3005:3005 meteora_swapquoter
3. python3 swapquoter.py



docker stop $(docker ps -q --filter "ancestor=meteora_swapquoter")
docker rm $(docker ps -aq --filter "ancestor=meteora_swapquoter")



