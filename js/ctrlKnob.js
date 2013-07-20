
// knob
$(function() {
    var leftSpace;
    function windowSizeChange() {
        var wSize=window.innerWidth;
        var jamAreaWidth=600; // .jamArea.width
        leftSpace=(wSize-jamAreaWidth)/2;

        $('<img />').knob({
            id: 'knob01', image: 'jqskin/images/strat.png',
            left: leftSpace+500, top: 810, width: 80, height: 80, value: 70,
            change: (
                function() {
                    var val = Math.floor($(this).knob("value") / 10);
                    document.getElementById("volumeText").innerHTML=val;
                    sj.setVolume(val/10);
                })
        }).appendTo('#volumeKnob');
        
        $('<img />').knob({
            id: 'knob01', image: 'jqskin/images/org_amp.png',
            left: leftSpace+400, top: 823, width: 64, height: 64, value: 20,
            change: (
                function() {
                    var val = Math.floor($(this).knob("value") / 10);
                    val = val/10;
                    document.getElementById("delayText").innerHTML=val;
                    sj.setDelay(val);
                })
        }).appendTo('#delayKnob');
        
    }
    
    window.onresize=function() {
        document.getElementById("delayKnob").innerHTML="";
        document.getElementById("volumeKnob").innerHTML="";
        windowSizeChange();
    };
    
    
    windowSizeChange();
});

