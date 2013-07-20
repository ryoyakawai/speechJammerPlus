/* *
 * 
 * speechJammer.js - v1.0 - 2013/07/12
 * Copyright (c) 2013 Ryoya KAWAi; Licensed MIT, GPL
 *
 * */

var SpeechJammer=function() {
    this.lms=null; // local media stream
    this.audioContext=new webkitAudioContext();
    this.webAudio={
        volumeRatio:  1.0,
        gainNode:     this.audioContext.createGainNode(),
        analyserNode: this.audioContext.createAnalyser(),
        delayNode:    this.audioContext.createDelayNode(),
        biquadFilter: { l : new Array(), h: new Array() },
        ngFollower:   this.audioContext.createBiquadFilter(),
        ngGate:       this.audioContext.createWaveShaper(),
        ngInputNode:  this.audioContext.createGain(),
        ngRectifier:  this.audioContext.createWaveShaper(),
        scrdelay: null,
        scldelay: null,
        scrdepth: null,
        scldepth: null,
        scsspeed: null,
        rmod: null,
        sfllfb: null,
        sflrfb: null,
        sflspeed: null,
        sflldepth: null,
        sflrdepth: null,
        sflldelay: null,
        sflrdelay: null,
        awFollower: null,
        awDepth: null,
        awFilter: null,
        waveshaper: null
    };
    
    this.analyserCanvas=null;
    this.analyserCanvas2d=null;
    this.audio=null;
    this.video=null;
    this.videoCanvas=null;
    this.videoCanvas2d=null;
    this.delayImageTag=null;
    this.rafId=null;
    this.timerId=null;
    this.nowOn=false;
    
    this.animationTimeInterval=500;
    this.imgContainer=new Array();

    this.effectList=[
        { val:"none",         name:"No Effect" },
        { val:"noisegate",    name:"Noise Gate" },
        { val:"ringmod",    name:"Ring mod" },
        { val:"telephonize",  name:"Telephonize" },
        { val:"distortion",       name:"Distortion" },
        { val:"stereoChorus",       name:"Stereo Chours" },
        { val:"stereoFlange", name:"Stereo Flange" },
        { val:"autowah",      name:"Autowah" },
        { val:"wah_dis_ch",   name:"Wah+Distortion+Stereo Chours" }
    ];

};

SpeechJammer.prototype={
    checkNowOn: function() {
        return this.nowOn;
    },

    setVideoCanvas: function(elem, size) {
        elem.setAttribute("width", size.width);
        elem.setAttribute("height", size.height);
        this.videoCanvas=elem;
        this.videoCanvas2d=this.videoCanvas.getContext("2d");
        this.videoCanvas.style.setProperty("visibility", "hidden");
        this.videoCanvas.style.setProperty("display", "none");
    },

    setDelayImageTag: function(elem, size) {
        this.delayImageTag=elem;
        this.delayImageTag.width=size.width;
        this.delayImageTag.height=size.height;
        this.delayImageTag.style.setProperty("background-color", "#0000ff");
    },

    setVideoStream: function(elem, size) {
        elem.setAttribute("width", size.width);
        elem.setAttribute("height", size.height);
        this.video=elem;
        this.video.autoplay=true;
        this.video.muted=true;
        this.video.controls=false;
        this.video.style.setProperty("visibility", "hidden");
        this.video.style.setProperty("display", "none");
    },

    setAnalyserCanvas: function(elem, size) {
        elem.setAttribute("width", size.width);
        elem.setAttribute("height", size.height);
        this.analyserCanvas=elem;
        this.analyserCanvas2d=this.analyserCanvas.getContext("2d");
        this._drawSpecAnaFrame(true);
    },
    
    startJamming: function() {
        this.nowOn=true;
        var scb=this.successCallback;
        var ecb=this.errorCallback;
        navigator.webkitGetUserMedia({video: true, audio: true}, scb.bind(this), ecb.bind(this));
    },

    successCallback: function(localMediaStream) {
        this.lms=localMediaStream;
        this.setVideo(this.lms);
        this.setAudio(this.lms, false);
        this.startImageBuffering();
    },

    getAudioEffectList: function() {
        return this.effectList;
    },

    setVideo: function(src) {
        this.video.src=window.webkitURL.createObjectURL(src);
    },
    
    setAudio: function(src, efNode) {
        this.audio=this.audioContext.createMediaStreamSource(src);
        this.webAudio.gainNode.gain.value=this.webAudio.volumeRatio*1;

        this.audio.connect(this.webAudio.gainNode);
        if(efNode===false) {
            this.webAudio.gainNode.connect(this.webAudio.delayNode);
            this.webAudio.delayNode.connect(this.webAudio.analyserNode);
            this.webAudio.analyserNode.connect(this.audioContext.destination);
        } else {
            this.webAudio.gainNode.connect(this.webAudio.delayNode);
            for(var i=0; i<efNode.in.length; i++) {
                this.webAudio.delayNode.connect(efNode.in[i]);
            }
            for(var i=0; i<efNode.out.length; i++) {
                efNode.out[i].connect(this.webAudio.analyserNode);
            }
            this.webAudio.analyserNode.connect(this.audioContext.destination);
            /*
            for(var i=0; i<efNode.out.length; i++) {
                efNode.out[i].connect(this.webAudio.delayNode);
            }
            this.webAudio.delayNode.connect(this.webAudio.analyserNode);
            this.webAudio.analyserNode.connect(this.audioContext.destination);
            */
            }
        
        this.webAudio.analyserNode.fftSize=1024;
        this.updateVisualiser(this.animationTimeInterval);
    },

    setAudioEffect: function(type) {
        var efNode=null;
        this.audio.disconnect();
        this.webAudio.gainNode.disconnect();
        this.webAudio.analyserNode.disconnect();
        this.webAudio.delayNode.disconnect();
        
        switch(type) {
          case "none":
            efNode=false;
            this.webAudio.volumeRatio=1.0;
            break;
          case "autowah":
            efNode=this.createAutowah();
            break;
          case "ringmod":
            efNode=this.createRingmod();
            break;
          case "stereoFlange":
            efNode=this.createStereoFlange();
            break;
          case "stereoChorus":
            efNode=this.createStereoChorus();
            break;
          case "telephonize":
            efNode=this.createTelephonizer();
            break;
          case "noisegate":
            efNode=this.createNoiseGate();
            break;
          case "distortion":
            efNode=this.createDistortion();
            this.webAudio.waveshaper.setDrive(5.0);
            break;
          case "wah_dis_ch":
            var tSC = this.createStereoChorus();
            var tDT = this.createDistortion();
            var tAW = this.createAutowah();
            tSC.out[0].connect(tAW.in[0]);
            tDT.out[0].connect(tAW.in[0]);
            efNode={ in:[ tSC.in[0], tDT.in[0]  ],  out:[ tAW.out[0] ] };
            this.webAudio.waveshaper.setDrive(20);
            break;
        }

        this.setAudio(this.lms, efNode);
    },


    createTelephonizer: function() {
        // C.W double up the filters to get a 4th-order filter = faster fall-off
        var lpf1=this.audioContext.createBiquadFilter();
        lpf1.type = lpf1.LOWPASS;
        lpf1.frequency.value = 2000.0;
        this.webAudio.biquadFilter.l[0]=lpf1;

        var lpf2=this.audioContext.createBiquadFilter();
        lpf2.type = lpf2.LOWPASS;
        lpf2.frequency.value = 2000.0;
        this.webAudio.biquadFilter.l[1]=lpf2;

        var hpf1=this.audioContext.createBiquadFilter();
        hpf1.type = hpf1.HIGHPASS;
        hpf1.frequency.value = 500.0;
        this.webAudio.biquadFilter.h[0]=hpf1;

        var hpf2=this.audioContext.createBiquadFilter();
        hpf2.type = hpf2.HIGHPASS;
        hpf2.frequency.value = 500.0;
        this.webAudio.biquadFilter.h[0]=hpf2;

        lpf1.connect( lpf2 );
        lpf2.connect( hpf1 );
        hpf1.connect( hpf2 );
        this.webAudio.volumeRatio=0.7;
        return { in:[lpf1], out:[hpf2] };
    },
    
    createStereoFlange: function () {
        var sflspeed = 0.15;
        var sfldelay = 0.003;
        var sfldepth = 0.005;
        var sflfb = 0.9;

        var splitter = this.audioContext.createChannelSplitter(2);
        var merger = this.audioContext.createChannelMerger(2);
        var inputNode = this.audioContext.createGain();
        this.webAudio.sfllfb = this.audioContext.createGain();
        this.webAudio.sflrfb = this.audioContext.createGain();
        this.webAudio.sflspeed = this.audioContext.createOscillator();
        this.webAudio.sflldepth = this.audioContext.createGain();
        this.webAudio.sflrdepth = this.audioContext.createGain();
        this.webAudio.sflldelay = this.audioContext.createDelay();
        this.webAudio.sflrdelay = this.audioContext.createDelay();

        this.webAudio.sfllfb.gain.value = this.webAudio.sflrfb.gain.value = parseFloat( sflfb );

        inputNode.connect( splitter );

        this.webAudio.sflldelay.delayTime.value = parseFloat( sfldelay );
        this.webAudio.sflrdelay.delayTime.value = parseFloat( sfldelay );

        splitter.connect( this.webAudio.sflldelay, 0 );
        splitter.connect( this.webAudio.sflrdelay, 1 );
        this.webAudio.sflldelay.connect( this.webAudio.sfllfb );
        this.webAudio.sflrdelay.connect( this.webAudio.sflrfb );
        this.webAudio.sfllfb.connect( this.webAudio.sflrdelay );
        this.webAudio.sflrfb.connect( this.webAudio.sflldelay );

        this.webAudio.sflldepth.gain.value = parseFloat( sfldepth ); // depth of change to the delay:
        this.webAudio.sflrdepth.gain.value = - parseFloat( sfldepth ); // depth of change to the delay:

        this.webAudio.sflspeed.type = this.webAudio.sflspeed.TRIANGLE;
        this.webAudio.sflspeed.frequency.value = parseFloat( sflspeed );

        this.webAudio.sflspeed.connect( this.webAudio.sflldepth );
        this.webAudio.sflspeed.connect( this.webAudio.sflrdepth );

        this.webAudio.sflldepth.connect( this.webAudio.sflldelay.delayTime );
        this.webAudio.sflrdepth.connect( this.webAudio.sflrdelay.delayTime );

        this.webAudio.sflldelay.connect( merger, 0, 0 );
        this.webAudio.sflrdelay.connect( merger, 0, 1 );

        this.webAudio.sflspeed.start(0);

        return {in: [ inputNode ], out:[ inputNode, merger ], level: 1.0};
    },
    
    createRingmod: function () {
        var drmfreq = 11;

        var gain = this.audioContext.createGain();
        var ring = this.audioContext.createGain();
        var osc = this.audioContext.createOscillator();

        osc.type = osc.SINE;
        this.rmod = osc;
        osc.frequency.value = Math.pow( 2, parseFloat( drmfreq ));
        osc.connect(ring.gain);

        ring.gain.value = 0.0;
        gain.connect(ring);

        osc.start(0);

        return {in: [ gain ], out:[ ring ], level: 1.0};
    },

    createAutowah: function() {
        var inputNode = this.audioContext.createGain();
        var waveshaper = this.audioContext.createWaveShaper();
        this.webAudio.awFollower = this.audioContext.createBiquadFilter();
        this.webAudio.awFollower.type = this.webAudio.awFollower.LOWPASS;
        this.webAudio.awFollower.frequency.value = 10.0;
        
        var curve = new Float32Array(65536);
        for (var i=-32768; i<32768; i++) {
            curve[i+32768] = ((i>0)?i:-i)/32768;
        }
        waveshaper.curve = curve;
        waveshaper.connect(this.webAudio.awFollower);
        
        this.webAudio.awDepth = this.audioContext.createGain();
        this.webAudio.awDepth.gain.value = 11585;
        this.webAudio.awFollower.connect(this.webAudio.awDepth);
        
        this.webAudio.awFilter = this.audioContext.createBiquadFilter();
        this.webAudio.awFilter.type = this.webAudio.awFilter.LOWPASS;
        this.webAudio.awFilter.Q.value = 15;
        this.webAudio.awFilter.frequency.value = 50;
        this.webAudio.awDepth.connect(this.webAudio.awFilter.frequency);
        
        inputNode.connect(waveshaper);
        inputNode.connect(this.webAudio.awFilter);
        return {in: [ inputNode ], out:[ this.webAudio.awFilter ]};
    },
    
    createDistortion: function() {
        if (!this.webAudio.waveshaper) {
            this.webAudio.waveshaper = new WaveShaper( this.audioContext );
        }
        this.webAudio.waveshaper.setDrive(15.0);
        return { in:[ this.webAudio.waveshaper.input ], out:[ this.webAudio.waveshaper.output ] };
    },

    createNoiseGate: function() {
        var ngFloor=0.01;
        var inputNode = this.audioContext.createGain();
        var rectifier = this.audioContext.createWaveShaper();
        this.webAudio.ngFollower = this.audioContext.createBiquadFilter();
        this.webAudio.ngFollower.type = this.webAudio.ngFollower.LOWPASS;
        this.webAudio.ngFollower.frequency.value = 10.0;

        var curve = new Float32Array(65536);
        for (var i=-32768; i<32768; i++) {
            curve[i+32768] = ((i>0)?i:-i)/32768;
        }
        rectifier.curve = curve;
        rectifier.connect(this.webAudio.ngFollower);
        
        this.webAudio.ngGate = this.audioContext.createWaveShaper();
        this.webAudio.ngGate.curve = this._generateNoiseFloorCurve(parseFloat(ngFloor));
        
        this.webAudio.ngFollower.connect(this.webAudio.ngGate);
        
        var gateGain = this.audioContext.createGain();
        gateGain.gain.value = 0.0;
        this.webAudio.ngGate.connect( gateGain.gain );
        
        inputNode.connect(rectifier);
        inputNode.connect(gateGain);

        return {in: [inputNode], out:[gateGain], level: 1.0};
    },
    _generateNoiseFloorCurve: function( floor ) {
        // "floor" is 0...1
        var curve = new Float32Array(65536);
        var mappedFloor = floor * 32768;
        
        for (var i=0; i<32768; i++) {
            var value = (i<mappedFloor) ? 0 : 1;
            
            curve[32768-i] = -value;
            curve[32768+i] = value;
        }
        curve[0] = curve[1]; // fixing up the end.
        
        return curve;
    },
    

    createStereoChorus: function() {
        var scspeed =3.0;
        var scdelay =0.055; // 0.03 // default
        var scdepth =0.004; // 0.002 // default
        
        var splitter = this.audioContext.createChannelSplitter(2);
        var merger = this.audioContext.createChannelMerger(2);
        var inputNode = this.audioContext.createGain();

        inputNode.connect( splitter );

        var delayLNode = this.audioContext.createDelay();
        var delayRNode = this.audioContext.createDelay();
        delayLNode.delayTime.value = parseFloat( scdelay );
        delayRNode.delayTime.value = parseFloat( scdelay );
        this.webAudio.scldelay = delayLNode;
        this.webAudio.scrdelay = delayRNode;
        splitter.connect( delayLNode, 0 );
        splitter.connect( delayRNode, 1 );

        var osc = this.audioContext.createOscillator();
        this.webAudio.scldepth = this.audioContext.createGain();
        this.webAudio.scrdepth = this.audioContext.createGain();

        this.webAudio.scldepth.gain.value = parseFloat( scdepth ); // depth of change to the delay:
        this.webAudio.scrdepth.gain.value = - parseFloat( scdepth ); // depth of change to the delay:

        osc.type = osc.TRIANGLE;
        osc.frequency.value = parseFloat( scspeed );
        this.webAudio.scspeed = osc;

        osc.connect(this.webAudio.scldepth);
        osc.connect(this.webAudio.scrdepth);

        this.webAudio.scldepth.connect(delayLNode.delayTime);
        this.webAudio.scrdepth.connect(delayRNode.delayTime);

        delayLNode.connect( merger, 0, 0 );
        delayRNode.connect( merger, 0, 1 );

        osc.start(0);

        return {in: [inputNode], out:[inputNode, merger], level: 1.0};
    },
    
    setVolume: function(value) {
        this.webAudio.gainNode.gain.value=this.webAudio.volumeRatio*value;
    },

    setDelay: function(value) {
        this.webAudio.delayNode.delayTime.value=value;
    },

    errorCallback: function(message) {
        console.log(message);
    },
    
    startImageBuffering: function() {
        var self=this;
        var saveImage=4;
        var intervalTime=1000/saveImage;
        this.timerId=setInterval(function(){
            var img=new Image();
            var type="image/png";
            self.videoCanvas2d.drawImage(self.video, 0, 0, 400, 300);
            if(self.imgContainer.length>saveImage){
              self.imgContainer.splice(0, 1);
            }
            self.imgContainer.push(self.videoCanvas.toDataURL(type));
            var dispIndex=saveImage-Math.floor(self.webAudio.delayNode.delayTime.value*saveImage);
            if(typeof self.imgContainer[dispIndex]=="string") {
              self.delayImageTag.src=self.imgContainer[dispIndex];
            }
        }, intervalTime);
    },

    _ImageData_multiplyAlpha: function(imageData, opacity) {
        var data = imageData.data;
        var n = data.length;
        for (var i=3; i<n; i+=4) {
            data[i] *= opacity;
        }
    },

    initImageArea: function() {
        var img=new Image();
        var type="image/png";
        this.videoCanvas2d.fillStyle="rgb(0, 0, 255)";
        this.videoCanvas2d.fillRect(0, 0, this.delayImageTag.width, this.delayImageTag.height);
        this.delayImageTag.src=this.videoCanvas.toDataURL(type);
    },

    stopJamming: function() {        
        // image
        this.initImageArea();

        this.nowOn=false;
        this.lms.stop();
        clearInterval(this.timerId);
        this.audio.disconnect();
        this.setVolume(0);
        var interval=10;
        var timeCount=0;
        var self=this;
        var timerId=setInterval(function() {
            if(timeCount>1000) {
                clearInterval(timerId);
                cancelAnimationFrame(self.rafId);
            } else {
                timeCount+=interval;
            }
        }, interval);
        

    },

    updateVisualiser: function(time) {
        this.updateAnalyser();
        this.rafId=requestAnimationFrame(this.updateVisualiser.bind(this));
    },

    updateAnalyser: function() {
        var freqByteData=new Uint8Array(this.webAudio.analyserNode.frequencyBinCount);
        this.webAudio.analyserNode.getByteFrequencyData(freqByteData);
        
        var sumMeter=0;
        for(var i=0; i<freqByteData.length; i++) {
            sumMeter+=freqByteData[i];
        }
        var aveMeter=sumMeter/freqByteData.length;
        
        this.analyserCanvas2d.clearRect(0, 0, this.analyserCanvas.width, this.analyserCanvas.height);

        this.analyserCanvas2d.lineCap="round";
        this.analyserCanvas2d.lineWidth=1.0;
                        
        this.analyserCanvas2d.fillStyle="#bbb";
        this.analyserCanvas2d.fillRect(0, 0, 400, 10);

        var grad=this.analyserCanvas2d.createLinearGradient(0,0, this.analyserCanvas.width,0);
        grad.addColorStop(0.0, '#00ffff');
        grad.addColorStop(0.3, '#00ff00');
        grad.addColorStop(0.6, '#ffff00');
        grad.addColorStop(0.9, '#ffa500');
        grad.addColorStop(1.0, '#ff0000');
        this.analyserCanvas2d.fillStyle = grad;
        
        this.analyserCanvas2d.fillRect(0, 0, aveMeter*3, this.analyserCanvas.height);
        this.analyserCanvas2d.stroke();
        
        // draw frame
        this._drawSpecAnaFrame(false);
    },

    _drawSpecAnaFrame: function(bg){
        if(bg!==true) {
            bg=false;
        }
            
        this.analyserCanvas2d.fillStyle="#666";
        this.analyserCanvas2d.rect(0, 0, 400, 10);
        
        if(bg==true) {
            this.analyserCanvas2d.fillStyle="#bbb";
            this.analyserCanvas2d.fillRect(0, 0, 400, 10);
        }
        
        var w=this.analyserCanvas.width/10;
        for(var i=0; i<parseInt(w); i++) {
            this.analyserCanvas2d.moveTo(i*w+0.5, 0);
            this.analyserCanvas2d.lineTo(i*w+0.5, this.analyserCanvas.height);
            this.analyserCanvas2d.stroke();
        }

    }

};