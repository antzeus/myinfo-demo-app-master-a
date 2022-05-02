var util={};

util.getmydate=function(){
    var date_ob=new Date();
    var date=("0" + date_ob.getDate()).slice(-2);
    var month=("0" + date_ob.getMonth() + 1).slice(-2);
    var year=date_ob.getFullYear();
    var hours=date_ob.getHours();
    var minutes=date_ob.getMinutes();
    var seconds=date_ob.getSeconds();
    return year + month + date + hours + minutes + seconds;
}

util.getmyfulldate=function(){
    var date_ob=new Date();
    var date=("0" + date_ob.getDate()).slice(-2);
    var month=("0" + date_ob.getMonth()).slice(-2);
    var year=date_ob.getFullYear();
    var hours=date_ob.getHours();
    var minutes=date_ob.getMinutes();
    var seconds=date_ob.getSeconds();
    return year + "-" + month  + "-" + date + " " + hours + ":" + minutes + ":" + seconds;
}

util.getVersion=function(){
    return "v1.3.2.19"
}

module.exports = util;