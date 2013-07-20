var sj=new SpeechJammer();

var vsCanvas=document.getElementById("videoStream");
var vsCanvasSize={width:400, height:300};
sj.setVideoStream(vsCanvas, vsCanvasSize);

var vcCanvas=document.getElementById("videoCanvas");
var vcCanvasSize={width:400, height:300};
sj.setVideoCanvas(vcCanvas, vcCanvasSize);

var alCanvas=document.getElementById("analyserCanvas");
var alCanvasSize={width:400, height:10};
sj.setAnalyserCanvas(alCanvas, alCanvasSize);

var di=document.getElementById("delayImage");
var diSize={width:400, height:300};
sj.setDelayImageTag(di, diSize);

/**
 *
 * initialization
 *
 */
// init input area
var divChangeEf=document.getElementById("changeEffect");
var selectElem=document.createElement("select");
var selectList=sj.getAudioEffectList();
selectElem.id="efList";
for(var i=0; i<selectList.length; i++) {
    selectElem.options[i]=new Option(selectList[i]["name"], i);
}
divChangeEf.appendChild(selectElem);

/**
 *
 * Event Listeners
 *
 */
/*
// start captureing
document.getElementById("startjamming").addEventListener("click", function(event) {
    sj.startJamming();
}, false);

// stop captureing
document.getElementById("stopjamming").addEventListener("click", function(event) {
    sj.stopJamming();
}, false);
*/

// 
document.getElementById("toggleStartButton").addEventListener("click", function(event) {
    var jB=this;
    switch(jB.name) {
      case "on":
        sj.startJamming();
        jB.className="btn btn-danger";
        jB.value="Jamming Off";
        jB.name="off";
        break;
      case "off":
        sj.stopJamming();
        jB.className="btn btn-primary";
        jB.value="Jamming On";
        jB.name="on";
        break;
    }
}, false);

// volume
document.getElementById("volumeKnob").addEventListener("change", function(event) {
    var val=document.getElementById("volumeKnob").value ;
    sj.setVolume(val/ 10);
    document.getElementById("volumeText").innerHTML=val;
}, false);

// delay
document.getElementById("delayKnob").addEventListener("change", function(event) {
    var val=document.getElementById("delayKnob").value;
    sj.setDelay(val/1000);
    var disp=val+" ms.";
    if(val>=1000) {
        disp="1 sec.";
    }
    document.getElementById("delayText").innerHTML=disp;
}, false);

// changeEffect
document.getElementById("efList").addEventListener("change", function(event) {
    if( sj.checkNowOn()===true ) {
        var selectList=sj.getAudioEffectList();
        var efChoice=document.getElementById("efList").selectedIndex;
        sj.setAudioEffect(selectList[efChoice].val);
    }
}, false);

//image Area
sj.initImageArea();

// fire Event to init
(function(){
    // fire click event // volume
    var e = document.createEvent('MouseEvent');
    var b = document.getElementById("volumeKnob");
    e.initEvent("change", true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
    b.dispatchEvent(e);
    // fire click event // delay
    var e = document.createEvent('MouseEvent');
    var b = document.getElementById("delayKnob");
    e.initEvent("change", true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
    b.dispatchEvent(e);
});