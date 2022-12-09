async function getList(zone_id, findByPort) {
    var req = await(await fetch(`${sets.cf.endpoint}zones/${zone_id}/dns_records?type=A`, {
        headers:cfheaders,
        method:"GET"
    })).json()
    if(req.success) {
        var res = reader(zone_id)
        var rev = {}
        req.result.map(({id, name, proxied, content})=>{
            rev[name]={proxied:(proxied)?"Y":"N", content}
        })
        var mapper = []
        res.map(({id, params, ip, port, domain})=>{

            var dop;
            if(rev[domain]){
                dop=rev[domain]
            }else{
                dop={
                    proxied:"?",
                    content:"0.0.0.0"
                }
            }
            if(!findByPort||(findByPort&&findByPort==port)) mapper.push({
                id,
                in:ip,
                port,
                out:dop.content,
                proxied:dop.proxied,
                domain
            })
        })
        console.table(mapper)

    }else{
        logErrors(req)
    }
};

export function reader(zone_id, full=false) {
    testDomainWorkerFile(zone_id)
    var filereader = fs.readFileSync(sets.nginx.configsPath+zone_id).toString();
    var filespacer = filereader.matchAll(/upstream.+?([0-9a-z]+)\D+server\D+?([0-9\.]+):([0-9]+)\D+?\D+name\D+?([0-9a-zA-Z\.\-]+?);/gm)

    var out = []
    while(true){
        var data = filespacer.next()
        if(data.done){
            break;
        }else{
            if(data.value.length==5){
                out.push({
                    id:data.value[1],
                    ip:data.value[2],
                    port:data.value[3],
                    domain:data.value[4]
                })
            }else{
                console.log("PARSE ERROR!", data.value)
            }
        }
    }
    return (full)?{full:filereader, out}:out
}