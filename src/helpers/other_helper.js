export function UCFirst(str){
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function UCFirstWords(str){
    return str.split(" ").map(word => UCFirst(word)).join(" ");
}