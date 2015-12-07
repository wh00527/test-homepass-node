var http = require('http');
var url = require('url');
var qstring = require('querystring');
var fs = require('fs');

function sendResponse(wData,res){
 var page ='<html>'+
     '<body>'+
     '<form method="post">' + 
     'city: <input name="city">'+
     'country: <input name="country">' + 
     'key: <input name="key">' +
     '<input type="submit" value="weather">'+
     '</form>';
     if(wData){
        page += '<p>' + wData + '</p>'; 
     }
     page += '</body></html>';
     res.end(page);
}


function parseWeather(wResponse,res){
    var wData = '';
    wResponse.on('data',function(chunk){
      wData += chunk;
    });
    
    wResponse.on('end',function(){
      var obj = JSON.parse(wData);
      if(obj.weather != undefined){
         var weather = obj.weather[0].description
      }else{
         var weather = 'sorry no result';
      }
      sendResponse(weather,res);
    });

}

function getWeather(city,country,key,res){
    var options = {
       host : 'api.openweathermap.org',
       path : '/data/2.5/weather?APPID='+key+'&q=' + city + ','+country
    };
       http.request(options,function(wResponse){
        parseWeather(wResponse,res);
       }).end();
}

function inArray(myArray,myValue){
    var inArray = false;
    myArray.map(function(key){
        if (key === myValue){
            inArray=true;
        }
    });
    return inArray;
};


function checkHourlyRate(file){
  var targetRequest = fs.readFileSync("./"+file, 'utf8');
  var array = targetRequest.split(',');
  return array[1] > 4 ? true : false;

}

function writeLimitCounts(file){
  fs.readFile(file, function(err, data) {
      if (!err) {
        var array = data.toString().split(',');
        var newCount = parseInt(array[1]) + 1;
        var timeStamp = Math.floor(Date.now() / 1000);
        
        if( ( timeStamp - parseInt(array[0]) ) > (1000*60*60) ) {
            newData = timeStamp + ',' + 0;
        }else{
            newData = array[0] + ',' + newCount;
        }

        fs.writeFile(file, newData, function(err) { 
              if (err) { 
                  console.log (err);
              }
         });

      } else {
          console.log(err);
      }
  });
}

http.createServer(function(req,res){
    if(req.method == 'POST'){
       var reqData = '';
       req.on('data',function(chunk){
          reqData += chunk;
       });
       req.on('end',function(){
          var postParams = qstring.parse(reqData);
          try {
            // check api key
              if(postParams.key ==''){
                 sendResponse('Api key is missing',res);
                 throw new Error("Api key issue");                 
                 return;
              }
            /*
              7e82f7f3287db6bd9622aa628b575c41
              5e0b90d08a13b27760bd00b814e43777
              13fa2555cf0572df94de6bc5ff1f35a3
              b2f99a7d568d67cc5e67c5a0726f743c 
              e76789173b6da7de53d2305980c24158           
             */
              var apiKeyArray = ['7e82f7f3287db6bd9622aa628b575c41','5e0b90d08a13b27760bd00b814e43777',
                                  '13fa2555cf0572df94de6bc5ff1f35a3','b2f99a7d568d67cc5e67c5a0726f743c',
                                  'e76789173b6da7de53d2305980c24158'];
              if(!inArray(apiKeyArray,postParams.key)){
                 sendResponse('Invalud api key',res);
                 throw new Error("Api key issue");                 
                 return;
              }

            // check hourly limit
              if( checkHourlyRate(postParams.key+'.txt') ){
                 sendResponse('Sorry! you reached the hourly limit',res);
                 throw new Error("Hourly Limit reached");                 
                 return;
              }
            // start API request
              getWeather(postParams.city,postParams.country,postParams.key,res);
            // write counted hourly request
              writeLimitCounts(postParams.key+'.txt');
          } catch (err) {
              // handle the error
              console.log(err)
          }
          
       });
    }else{
     sendResponse(null,res)
    }

}).listen(8080);
