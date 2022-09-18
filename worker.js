import fetch from 'node-fetch';
import fs from 'fs';
import { exec } from 'child_process';

const sets = JSON.parse(fs.readFileSync("settings.json"))

const cfheaders = {
    "Content-Type":"application/json",
    "X-Auth-Email":sets.cf.email,
    "X-Auth-Key":sets.cf.token
}

async function getIP(){
    var ft = await fetch("https://api.ipify.org")
    return ft.text()
}

function reloadNginx() {
    exec("/etc/init.d/nginx reload", (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
    })
}

function logErrors(req){
    if(req.errors){
        req.errors.map(({code, message})=>{
            console.log(`[ERROR] ${code}: ${message}`)
        })
    }
    if(req.error){
        console.log(`[ERROR] ${req.code}: ${req.error}`)
    }
    
}

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

function testDomainWorkerFile(zone_id) {
    if(!fs.existsSync(sets.nginx.configsPath)) fs.mkdirSync(sets.nginx.configsPath)
    if(!fs.existsSync(sets.nginx.configsPath+zone_id)) fs.writeFileSync(sets.nginx.configsPath+zone_id, "#Don't look this legacy code!");
}

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

export async function writer(zone_id, ip, port, domain) {
    testDomainWorkerFile(zone_id)
    var req = await(await fetch(`${sets.cf.endpoint}zones/${zone_id}/dns_records`, {
        headers:cfheaders,
        method:"POST",
        body:JSON.stringify({
            type:"A",
            name:domain,
            content:await getIP(),
            ttl:1,
            proxied:true
        })
    })).json()

    if(req.success) {
        await fs.appendFileSync(sets.nginx.configsPath+zone_id, `\n#SW\nupstream ${req.result.id} { server ${ip}:${port}; } #Dont edit this!\nserver{ server_name ${domain}; #And this line.\n    listen 443 ssl;\n    location / {\n        proxy_pass http://${req.result.id};\n        proxy_redirect off;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header Host $http_host;\n        proxy_pass_header Set-Cookie;\n        proxy_set_header Upgrade $http_upgrade;\n        proxy_set_header Connection upgrade;\n        proxy_set_header Accept-Encoding gzip;\n    }\n}\n#EW\n`)
        reloadNginx()
        console.log("Done. ID:"+req.result.id)
    }else{
        logErrors(req)
    }
}

export async function deleter (zone_id, id) {
    testDomainWorkerFile(zone_id)

    var finded = null;
    var readed = reader(zone_id, true)
    readed.out.map(record=>{
        if(record.id==id){
            finded=record
        }
    })

    if(finded){
        var req = await(await fetch(`${sets.cf.endpoint}zones/${zone_id}/dns_records/${id}`, {
            headers:cfheaders,
            method:"DELETE"
        })).json()
        if(req.success) {
            fs.writeFileSync(sets.nginx.configsPath+zone_id, readed.full.replace(new RegExp(`\\n#SW\\D+?upstream.+?${id}(.|\\D)+?#EW\\n`, "gm"), ""))
            reloadNginx()
            console.log("Done.")
        }else{
            logErrors(req)
        }
    }else{
        console.log("ID not found.")
    }
}



(async (argv)=>{
    console.log("argv", argv)
    switch (argv[0]) {
        case "list":
            if(argv.length>1){
                var zone_id = sets.cf.zone_ids[argv[1]]
                if(zone_id){
                    getList(zone_id, (argv.length>2)?argv[2]:null)
                }else{
                    console.log("Domain not found")
                }
            }else{
                console.log("Miss parametr { 1 - Domain | 2 - PORT ( opt ) }")
            }
            
            break;

        case "add":
            if(argv.length>4){
                var zone_id = sets.cf.zone_ids[argv[1]]
                if(zone_id){
                    writer(zone_id, argv[2], argv[3], argv[4]+"."+argv[1])
                }else{
                    console.log("Domain not found")
                }
            }else{
                console.log("Miss parametr { 1 - Domain | 2 - Local IP | 3 - Port | 4 - domain_name (  [DOMAIN_NAME].example.com  ) }")
            }
            
            break;

        case "del":
            if(argv.length>2){
                var zone_id = sets.cf.zone_ids[argv[1]]
                if(zone_id){
                    deleter(zone_id, argv[2])
                }else{
                    console.log("Domain not found")
                }
            }else{
                console.log("Miss parametr { 1 - Domain | 2 - Domain ID }")
            }
            
            break;

        case "init":
            console.log("Open /etc/nginx/nginx.conf and add in 'http { ... }':")
            console.log("include "+sets.nginx.configsPath+"*;")

        default:
            break;
    }

})(process.argv.slice(2))