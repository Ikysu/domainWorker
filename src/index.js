import fetch from 'node-fetch';
import fs from 'fs';
import { exec } from 'child_process';
import inquirer from 'inquirer';

const sets = JSON.parse(fs.readFileSync("settings.json"))
const nginxPath = sets.nginxPath.at(-1) == "/" ? sets.nginxPath : sets.nginxPath + "/"

const cfheaders = {
    "Content-Type":"application/json",
    "X-Auth-Email":sets.cf.email,
    "X-Auth-Key":sets.cf.token
}

async function getMyIP(){
    var res = await fetch("https://api.ipify.org")
    if(res.ok){
        return ft.text()
    }else{
        return false
    }
}

function reloadNginx() {
    exec("/etc/init.d/nginx reload", (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
    })
}




function checkCert(zone, certs, autocert) {
    if((!autocert||!sets.genCert)&&!certs) {
        inquirer.prompt([
            {
                type:"confirm",
                name:"checking",
                message:"You have not provided certificates. The domain will only work in HTTP, without data encryption. Continue?",
                default:false
            }
        ]).then({
            
        })
    }else{
        
    }
}

function getCert(zone) {
    let spl = zone.split(".");
    if(spl.length>2){
        return genCert(zone,sets.cf.zones[zone]?.["next-level"]?.[spl.slice(0,-2).join(".")])
    }else{
        return genCert(zone,sets.cf.zones[zone]?.certs)
    }
}











































inquirer.prompt([
    {
        type: 'list',
        name: 'section',
        message: 'Choose a section:',
        choices: [
            'DNS',
            'ZONE',
        ],
    },


    // =============== DNS Working ===============
    
    {
        type: 'list',
        name: 'method',
        message: 'What do you want to do?',
        choices: [
            'View DNS Records',
            'Add DNS Record',
            {
                name: 'Update DNS Record',
                disabled: 'Unavailable at this version',
            },
            'Remove DNS Record',
        ],
        when:q=>[
            'DNS'
        ].includes(q.section)
    },
    {
        type: 'list',
        name: 'zone',
        message: 'Choose zone:',
        choices: Object.keys(sets.cf.zones),
        when:q=>[
            'DNS'
        ].includes(q.section)
    },

    // Add DNS Record
    {
        type: 'input',
        name: 'domain',
        message: 'Domain name (@ - zone, no dot at the end):',
        default: '@',
        when:q=>[
            "Add DNS Record"
        ].includes(q.method)&&[
            'DNS'
        ].includes(q.section)
    },
    {
        type: 'input',
        name: 'local_ip',
        message: 'Local IP:',
        default: '0.0.0.0',
        when:q=>[
            "Add DNS Record"
        ].includes(q.method)&&[
            'DNS'
        ].includes(q.section)
    },
    {
        type: 'input',
        name: 'local_port',
        message: 'Local PORT:',
        when:q=>[
            "Add DNS Record"
        ].includes(q.method)&&[
            'DNS'
        ].includes(q.section)
    },



    // =============== Zone working ===============

    {
        type: 'list',
        name: 'method',
        message: 'What do you want to do?',
        choices: [
            'View zones list',
            'Add zone (localy)',
            'Remove zone (localy)',
        ],
        when:q=>[
            'ZONE'
        ].includes(q.section)
    },
    {
        type: 'input',
        name: 'zone_name',
        message: 'Zone name:',
        when:q=>[
            "Add zone (localy)",
            "Remove zone (localy)"
        ].includes(q.method)&&[
            'ZONE'
        ].includes(q.section)
    },

    // Add zone (localy)
    {
        type: 'confirm',
        name: 'zone_autocert',
        message: 'Generate SSL cert automatically?:',
        default: false,
        when:q=>[
            "Add zone (localy)"
        ].includes(q.method)&&[
            'ZONE'
        ].includes(q.section)
    },

    {
        type: 'input',
        name: 'zone_crt_path',
        message: 'Zone public crt path:',
        when:q=>[
            "Add zone (localy)"
        ].includes(q.method)&&[
            'ZONE'
        ].includes(q.section)&&!q.zone_autocert
    },
    {
        type: 'input',
        name: 'zone_key_path',
        message: 'Zone private key path:',
        when:q=>[
            "Add zone (localy)"
        ].includes(q.method)&&[
            'ZONE'
        ].includes(q.section)&&!q.zone_autocert
    },


]).then(({section, method, zone, domain, local_ip, local_port, zone_name}) => {
    switch (section) {
        case "DNS":
            switch (method) {
                case 'View DNS Records':
                    console.log("not work")
                    
                    break;
                case 'Add DNS Record':
                    console.log("not work")
                    
                    break;
                case 'Update DNS Record':
                    console.log("not work")

                    break;
                case 'Remove DNS Record':
                    console.log("not work")
                    
                    break;
            }
            break;
        case "ZONE":
            switch (method) {
                case 'View zones list':
                    console.log("not work")
                    
                    break;
                case 'Add zone (localy)':
                    console.log(getCert(zone_name))    

                    break;
                case 'Remove zone (localy)':
                    console.log("not work")
                    
                    break;
            }
            break;
            break;
    }
    
    console.log(answers);
});