function file(path) {
    if(!fs.existsSync(path)) fs.mkdirSync(path)
}

function folder(path) {
    if(!fs.existsSync(path)) fs.writeFileSync(path, "#Don't look this legacy code!");
}

export default function (nginxPath, file=null) {
    folder(nginxPath+`certs`);
    folder(nginxPath+`zones`);
    if(file) file(nginxPath+file)
}