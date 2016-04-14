//controller.js: Add temp and humidity controllers to CellarWarden.

var VERBOSE = false;

var fs = require( 'fs' ); //Read and write controllers to file.
var PID1 = require('./PID.js');
var atPID = require('./atPID.js');
var autoTune = require('./autotune.js');
var gpio = require('rpi-gpio');
var utils = require('./utils.js');
var tprof = require('./tprofiles.js');
var act = require('./actuators.js');
var tpTimer = require('./tpTimer.js');
var Ctrl = function() {};
var dirName = __dirname;
var tpThreshold = 5;  //Threshold for tpTimer. If output less than this, actuator turned off and tpTimerWindow() is skipped.
var autotuneOn = false;

var PID = new PID1(50, 66, 10,2,1, PID1.DIRECT );

//State constants;
var st_OFF =       0;
var st_IDLE =      1;
var st_COOL =      2;
var st_COOLWAIT =  3;
var st_HEAT =      4;
var st_HEATWAIT =  5;
var st_DEHUM =     6;
var st_DEHUMWAIT = 7;
var st_HUMI =      8;
var st_HUMIWAIT =  9;
var st_PAUSE =     10;
var st_RESET =     11;
var st_atCOOL =    12;
var st_atHEAT =    13;

var st_name = [];
st_name[0] = 'Off';
st_name[1] = 'Idling';
st_name[2] = 'Cooling';
st_name[3] = 'Waiting to Cool';
st_name[4] = 'Heating';
st_name[5] = 'Waiting to Heat';
st_name[6] = 'Dehumidifying';
st_name[7] = 'Waiting to Dehumidify';
st_name[8] = 'Humidifying';
st_name[9] = 'Waiting to Humidify';
st_name[10] = 'Paused';
st_name[11] = 'Resetting';
st_name[12] = 'Cool Autotuning'
st_name[13] = 'Heat Autotuning'
exports.st_name = st_name;

var st_marker =   100; //Height of state marker in logfile. Need to adjust for Fahrenheit vs. Celsius. Or, use 
                      //  dual axis when displaying the logfile.

//Time increment to process.
var t_SEC =  1;
var t_MIN =  2;
var t_HOUR = 3;
var t_DAY =  4;

//Actuator constants.
var act_on =     1;
var act_off =    2;
var act_idle =   0;

//Initialize loop for first run or after restart (power failure?);
var loopFirst = true;

//Other variables.
var logFilePath = dirName + '/public/controls/';        //Add subdirectory, like ./controllers ?
var ctrlsFileName = dirName + '/public/controllers.json';
var saveCtrlFileDelay = 1;        //Save Ctrls to file after this number of minutes has elapsed.
var ctrlsFileLastSave = new Date();

//Ctrl.init - Set up a new controller object (JSON object not JSON array of objects).
Ctrl.prototype.init = function() {
    this.cfg = {               //   *** Configuration variables; user editable *** 
        activate : true,       //Is this controller active? This toggles controller state (.isActive) in Ctrl.process().
        type : 'TEMP',         //HUMD or TEMP
        name : 'Temperature 1',//Name of controller. 
        sensor : 'temp1',      //Sensor name picked from list (in config window)
        sensor2 : '',          //Name of secondary sensor picked from list 
        sensor2Priority: 0,    //Priority for secondary sensor (0-100%)
        logData : true,        //Log data to logFile? (true or false)
        logFileName : 'temp1.csv', //Name of controller logfile. 
        endSetpoint : 60,      //Ending setpoint (setpoint when process is finished; allows for ramping)
        outputMode: 0,         //Output mode: 0 = auto, 1 = manual cool, 2 = manual heat; endSetpoint used as a % in manual mode.
        coolPin : '',          //GPIO pin for cooling/dehumidification (decreasing to setpoint).
        coolUsePWM : false,    //Use PWM on cooling pin (true or false)? Use pigpio library to process if true.
        coolPinInvert : false,  //Invert this GPIO pin (e.g. for Sainsmart relay board)?
        coolCtrlMode : 'HYS',  //PID or HYS for cooling pin.
        coolDelay : 0,         //Minutes to delay before activating cooling/dehumidifier.
        coolHys: 2,            //Cooling hysteresis value.
        coolKp: 2.5,           //Cooling PID parameters. 
        coolKi: 0.0035,
        coolKd: 6,
        coolTpWindow: 300,     //Cooling time proportioning window length (in seconds)
        heatPin : '',          //GPIO pin for heating/humidification (raising to setpoint).
        heatUsePWM : false,    //Use PWM on heating pin (true or false)? Use pigpio library to process if true.
        heatPinInvert : false,  //Invert this GPIO pin (e.g. for Sainsmart relay board)?
        heatCtrlMode : 'HYS',  //PID or HYS for cooling pin.
        heatDelay : 0,         //minutes to delay before heating/humidifying.
        hysteresis : 2,        //Hysteresis value; treated as +/- (won't heat or cool if over or under by this value).
        heatHys: 2,            //Heating hysteresis value.
        heatKp: 2.5,           //Heating PID parameters.
        heatKi: 0.0035,
        heatKd: 6,           
        heatTpWindow : 4,      //Time in seconds for PID output to be integrated (10% output = 30 out of 300 seconds) for heating.
        pidAutoTune : '',      //Autotune flag. Set to 'cool' or 'heat' if autotuning, '' if not running. 
        useProfile : false,    //Use a temperature profile?
        profileName :'',       //Name of temperature profile.
        tprofTimeInc : t_DAY,  //Time increment to use for profiles.
        tprofActive : false,   //Profile will not run if this flag is false. Needs to be set true by client.
        deleteFlag: false,     //Flag set by client to request server to delete this ctrl object.
        rstGPIO: false,         //Flag to reset GPIO
        rstPID: false,          //Flag to reset PID
        rstProf: false          //Flag to reset profile
    },                          //    *** State variables changed by ctrl.process(). *** 
    this.logCounter = 0;        //Keeps track of when to save logfile based on logincrement.
    this.currState = st_OFF;    //State of this control [Off, Idling, Cooling, Waiting for Cool, Heating, Waiting for Heat, etc]
    this.isActive = false;      //Is control active or inactive? Processing only occurs if this is true.
    this.input = 50;            //Input from sensor, current value from this sensor (passed from main program)
    this.currSetpoint = 70;     //Current setpoint (calculated)
    this.coolPinRegd = false;   //True after gpio pin has been registered. Blocks write calls until registered.
    this.coolOn = false;        //Is cooling currently active (true) or not (false)?
    this.coolDelayStart = 0;    //Unix time when cool delay started.
    this.coolDelayOn = false;   //Cool delay has been activated.
    this.heatPinRegd = false;   //True after gpio pin has been registered. Blocks write calls until registered.
    this.heatOn = false;        //Is heating currently active or not?
    this.heatDelayStart = 0;    //Unix time when heat delay started.
    this.heatDelayOn = false;   //Heat delay is active.
    this.dt = 1000;             //Time delta for PID
    this.tpWindowStart = 0;     //Time timeWindow() last called.
    this.tpSampleRate = 200;    //Sample rate in milliseconds for tpTimer setInterval timing.
    this.PID = null;            //Handle for controller PID (uni- or bi-directional depending on settings).
    this.output = 0;            //Output (from PID) that ranges from 0 to 100% to activate heating or cooling.
    this.tprofCurrSegm = 0;     //Index of current profile segment.
    this.tprofSegmElapsed = 0;  //Time elapsed for current profile segment.
    this.tprof = [
        new tprof.init()
    ];                          //Temperature profile array. 
};

//Ctrl.getStateName - determines state name using st_name array.
//  st_index - index of st_name array (uses st_ constants defined above).
//  returns state name from array.
Ctrl.prototype.getStateName = function( st_index ) {
    return st_name[ st_index ];
};

//Ctrl.addCtrl - Adds a controller object to controllers array.
//  Also, initializes JSON array if new initialized controller added.
//  ctrls = name of JSON array to pass.
//  newCtrl = controller object to add to ctrls JSON array.
//  returns array of controllers. To initialize array, call with addCtrl( ctrls, new this.init().
Ctrl.prototype.addCtrl = function( ctrls, newCtrl ) {
    ctrls.push( newCtrl );
    return ctrls;
};

//Ctrl.removeCtrl - Removes a controller object from controllers array.
//  ctrls = name of JSON array to pass.
//  index = index of controller to remove from array.
Ctrl.prototype.removeCtrl = function( ctrls, index ) { 
    ctrls.splice( index, 1 );
    return ctrls;
};

//Ctrl.updateCtrl - Updates a controller object in controllers array.
//  ctrls = name of JSON array to pass.
//  ctrl = name of JSON controller object with updated values to replace in array.
//  index = index of controller to update.
Ctrl.prototype.updateCtrl = function( ctrls, ctrl, index ) {
    if ( index > -1 ) {
        ctrls[ index ] = ctrl;
    };
    return ctrls;
};

//Ctrl.updateCtrlsConfig - Updates config variables in all controllers while preserving state variables.
//  This function is called after client Saves controller config.
//  ctrlsOld = name of existing JSON array with state variables to preserve.
//  ctrlsNew = name of JSON controllers array with updated cfg variables.
//  returns updated ctrls
Ctrl.prototype.updateCtrlsConfig = function( ctrlsOld, ctrlsNew ) {

    var ind = 0;

    utils.log( 'updateCtrlsConfig: ctrlsOld.length=' + ctrlsOld.length +
        '\tctrlsNew.length=' + ctrlsNew.length, 'green', false, false );

    //Check to see if ctrlsNew is same length as ctrlsOld.
    if( ctrlsNew.length == ctrlsOld.length ) {
        //Update cfg variables in ctrlsOld with those in ctrlsNew.
        for (ind = 0; ind < ctrlsOld.length; ind++ ) {
            //Copy cfg variables from ctrlsNew into ctrlsOld
            ctrlsOld[ind].cfg = JSON.parse( JSON.stringify( ctrlsNew[ind].cfg ) );
            //Now, update all tprof config variables without affecting tprof state variables.
            var tprof1 = [];
            var ind2 = 0;
            for (ind2 = 0; ind2 < ctrlsOld[ind].tprof.length; ind2++ ) {
                tprof1 = JSON.parse( JSON.stringify( ctrlsNew[ind].tprof ) );
                ctrlsOld[ind].tprof = tprof.updSegm( tprof1, ind2, 
                    ctrlsNew[ind].tprof[ind2].cfg.duration,
                    ctrlsNew[ind].tprof[ind2].cfg.startSP,  
                    ctrlsNew[ind].tprof[ind2].cfg.endSP,
                    ctrlsNew[ind].tprof[ind2].cfg.ramp,
                    ctrlsNew[ind].tprof[ind2].cfg.hold );
            };  
        };
    } else if( ctrlsNew.length > ctrlsOld.length ) {  //Added an element.
        //First, update cfg variables in ctrlsOld with those in ctrlsNew.
        for (var ind = 0; ind < ctrlsOld.length; ind++ ) {
            ctrlsOld[ind].cfg = JSON.parse( JSON.stringify( ctrlsNew[ind].cfg ) );
        };

        //Next, add extra controller element(s) in ctrlsNew in full to ctrlsOld.
        var nextElem = ind;
        for ( ind = nextElem; ind < ctrlsNew.length; ind++ ) {
            ctrlsOld.push( JSON.parse( JSON.stringify( ctrlsNew[ind] ) ) );
            //Now, update all tprof config variables without affecting tprof state variables.
            var tprof1 = [];
            var ind2 = 0;
            for (ind2 = 0; ind2 < ctrlsOld[ind].tprof.length; ind2++ ) {
                tprof1 = JSON.parse( JSON.stringify( ctrlsNew[ind].tprof ) );
                ctrlsOld[ind].tprof = tprof.updSegm( tprof1, ind2, 
                    ctrlsNew[ind].tprof[ind2].cfg.duration,
                    ctrlsNew[ind].tprof[ind2].cfg.startSP,  
                    ctrlsNew[ind].tprof[ind2].cfg.endSP,
                    ctrlsNew[ind].tprof[ind2].cfg.ramp,
                    ctrlsNew[ind].tprof[ind2].cfg.hold );
            };  
        };
        //return ctrlsOld; 
    };

    //Make sure that both arrays are same length now.
    if (ctrlsOld.length != ctrlsNew.length ) {
        utils.log( 'ERROR: controllers.js - updateCtrlsConfig(): ctrlsOld larger than ctrlsNew.', 'green', false, false );
        return ctrlsOld;
    };
    
    //Now, check for any deletions in ctrlsNew. If so, delete these elements in ctrlsOld.
    for (ind = 0; ind < ctrlsOld.length; ind++ ) {
        if (ctrlsNew[ind].cfg.deleteFlag == true ) {
 
            utils.log( 'Deleting controller ' + ind + ' (' + ctrlsOld[ind].cfg.name + ')...', 'green', false, false );
            //Turn off actuators associated with this ctrl before deletion.
            act.actuatorsOff( ctrlsOld, ind ); 
     
            //Now delete the element(s).
            ctrlsOld.splice( ind, 1 ); 
        };
    };

    //Lastly, set currState to st_RESET so that controllers are reset with new parameters.
    for (ind = 0; ind < ctrlsOld.length; ind++ ) {
        ctrlsOld[ind].currState = st_RESET;
    };
    
    return ctrlsOld;
};

//Ctrl.checkCtrls - Checks to ensure that ctrls array contains at least one valid ctrls object.
//  ctrls1 - ctrls array to check.
//  returns true if valid or false if not valid
Ctrl.prototype.checkCtrls = function( ctrls1 ) {
    for (var key in ctrls1 ) {
        if (Object.prototype.hasOwnProperty.call( ctrls1, key)) {
            //Add additional tests here...
            if ( ( ctrls1[0].cfg.type == 'HUMD' ) || ( ctrls1[0].cfg.type == 'TEMP' ) ) {
                return true;
            };
            //utils.log( 'ctrls1[0].cfg.type: ' + ctrls1[0].cfg.type, 'green' ); 
        };
    };
    return false;
};

//Ctrl.loadCtrlsFile - Loads controls from JSON file. If file not found, create a new one with default controller object.
//  filename - filename to load
//  returns - controllers JSON array.
Ctrl.prototype.loadCtrlsFile = function( fileName ) {
    var retCtrls = [];
    utils.readFromJsonFile( fileName, function(err, data) {
        if (err) {
            utils.log('Error reading controllers file '+ fileName, 'green', false, false );
            retCtrls = null;
        } else {
            retCtrls = JSON.parse( JSON.stringify (data ) );
            utils.log( 'Number of controls loaded: ' + retCtrls.length, 'green', false, false );
        };
    });

        
    /*
    setInterval( function() { 
        return retCtrls;
    }, 1000 );
    */

    return retCtrls;
};

//Ctrl.writeCtrlsFile - write current controllers JSON array to file.
//  ctrls - JSON array of controllers
//  filename - name of file to save
Ctrl.prototype.writeCtrlsFile = function( ctrls, filename ) {
    utils.writeToJsonFile( ctrls, filename, function(err, data) {
        if( err) {
            utils.log( 'Could not save controller settings to file '+ filename + '. ERROR: ' + err, 'red', true, false );
        } else {
            if (VERBOSE) {utils.log( 'Saved controller settings to ' + filename + '.', 'green', true, false )};
        };
    });
};

//Ctrl.process - Called from CellarW; runs through each controller to determine if actuators need to be activated.
//  ctrls = name of JSON array with all controllers.
//  sensorData = name of JSON object with current sensor values.
//  returns error if one exists
Ctrl.prototype.process = function( ctrls, sensorData, logIncrement ) {
    var error = null;
    var i = 0;
    
    //Check to ensure that ctrls object is valid before processing.
    if (this.checkCtrls( ctrls ) == false ) {
        utils.log('Controllers object is invalid or damaged. Controllers are inactivated.', 'green', false, false );
        return ctrls;
    } else {
        //utils.log( 'Processing controllers in controller.js...', 'green', false, false);
    };
    if (ctrls.length < 1 ) {
        utils.log('No controllers to process!', 'green', false);
        return ctrls;
    };

    //Setup tpHandle array if not already done so.
    tpTimer.tpHandleSetup( ctrls );

    //Iterate through each object in ctrls array and process.
    for ( i=0; i < ctrls.length; i++ ) {
        
        //Client has activated controller, so turn it on.  
        if ( ( ctrls[i].isActive == false ) && ( ctrls[i].cfg.activate == true )  ) {
            ctrls[i].isActive = true;
            utils.log( 'Controller ' + i + ' (' + ctrls[i].cfg.name + ') activated by client.', 'green', false );
        };

        //First time through loop (startup or resume after power failure)?
        //  Prevents activation of heating or cooling until after delay is passed.
        if ( loopFirst ) {
            this.initLoop( ctrls, i );
            //Turn off loopFirst flag after iterating to last controller.
            if( i == ( ctrls.length - 1 ) ) {
                utils.log( 'Restarting all controllers after interruption.', 'green', true, false );
                loopFirst = false;
            };
        };

        //Only process active controllers. 
        if ( ctrls[i].isActive == true ) {

            //If client has turned off controller, shut it down.
            if ( ctrls[i].cfg.activate == false ) {
                act.actuatorsOff( ctrls, i )
                ctrls[i].isActive = false;
                utils.log( 'Controller ' + i + ' (' + ctrls[i].cfg.name + ') turned off by client.', 'green', true, false );
                return ctrls;
            };

            //If currState is OFF (turned off in tprofiles), turn off controller and exit.
            //if (ctrls[i].currState == st_OFF ) {
            //    ctrls[i].isActive = false;
            //    this.actuatorsOff( ctrls, i );  //Turn off actuator pins associated with this controller.
            //    return ctrls;
            //}; 

            //If currState = st_RESET, initialize/reset the controller.
            if ( ctrls[i].currState == st_RESET ) {
                this.resetCtrl( ctrls, i );
                //return ctrls;
            };
 
            //Determine current input value from sensor(s) for controller.
            ctrls[i].input = this.calculateInput( sensorData, ctrls, i );

            //If returned sensor value is NaN (error condition), inactivate this controller.                     
            if (ctrls[i].input == NaN ) {                                    
                ctrls[i].isActive = false; 
                utils.log( 'ERROR: Sensor value invalid. Shutting down controller ' + i + ' (' + ctrls[i].cfg.name + ')...', 'green', true, false );                                        
                return ctrls;        
            };
  
            //Calculate current setpoint using temperature profile.
            ctrls = this.findSetpoint( ctrls, i );

            //Set actuators for this control.
            if (VERBOSE) { utils.log( 'Controller ' + i + ' input: ' + ctrls[i].input + ' setpoint: ' + ctrls[i].currSetpoint, 'green' ) };
            this.processActuators( ctrls, i );  

            //Write data to logfile (if active).
            //  Only write to file every few times through loop, so add logic for this.
            if ( ctrls[i].logCounter > logIncrement ) {
                this.writeToLogFile( ctrls, i );
                ctrls[i].logCounter = 0;
            } else {
                ctrls[i].logCounter++;
            };  
        
        } else {
            //This controller is off (ctrls[i].isActive == false), so turn off actuators, set currState to st_OFF and cfg.activate false.
            if ( ctrls[i].currState != st_OFF ) {
                act.actuatorsOff( ctrls, i );  //Turn off actuator pins associated with this controller.
                ctrls[i].currState = st_OFF;
                ctrls[i].activate = false;
                utils.log( 'Controller ' + i + ' (' + ctrls[i].cfg.name + ') shutting down...', 'green', true, false );
            };
        };

    };  //End of for loop.
    
    //AutoSave controllers array to file after set delay has elapsed.
    var now = new Date();
    if ( utils.minutesElapsed( ctrlsFileLastSave, now ) >= saveCtrlFileDelay ) {  
        this.writeCtrlsFile( ctrls, ctrlsFileName );
        ctrlsFileLastSave = now;
    }; 
 
    return ctrls;
};

//Ctrl.initLoop - initialize variables on first time through loop.
//  ctrls - array of controller objects
//  index - index of current controller.
Ctrl.prototype.initLoop = function( ctrls, i ) {
    if (ctrls[i].cfg.coolDelay > 0 ) {  
        ctrls[i].checkCoolDelay = false;
    };
    if (ctrls[i].cfg.heatDelay > 0 ) {
        ctrls[i].checkHeatDelay = false;
    };

    //Make controllers initialize.
    ctrls[i].currState = st_RESET;
    ctrlsFileLastSave = new Date();
};

//Ctrl.resetCtrl() - Reset or initialize a controller for processing using new parameters.
//  This function sets up associated GPIO pins for output as well as PID and timer functions needed.
//  ctrls - array of controller objects.
//  index - index of current controller.
Ctrl.prototype.resetCtrl = function( ctrls, i ) {
    utils.log( 'Initializing controller ' + i + ' (' + ctrls[i].cfg.name + ')...', 'green', false, false );
  
    //Set up GPIO pin(s) for output in BCM mode.
    act.gpioInit( ctrls, i );

    //Set up PID (if active).
    this.pidInit( ctrls, i );

    //Turn any delays off.
    ctrls[i].coolDelayOn = false;
    ctrls[i].heatDelayOn = false;
  
    //Destroy existing tpTimer, if active.
    tpTimer.tpTimerKill( ctrls, i );

    //Turn off gpio pins in case they were left on.
    act.actuatorsOff( ctrls, i );

    //Set currState to st_IDLE to prevent resetting again.
    ctrls[i].currState = st_IDLE;
};

//Ctrl.calculateInput - determines input, even if this is a composite of primary and secondary sensor.
//  sData = sensor data
//  ctrls = array of controller objects
//  i = index of current controller
//  returns calculated input from sensor(s)
Ctrl.prototype.calculateInput = function( sData, ctrls, i ) {
    
    var retVal = NaN;

    var input1 = NaN;
    if ( ctrls[i].cfg.sensor !=='' ) {
        input1 = getSensorInput( sData, ctrls[i].cfg.sensor );
    } else {
    	return NaN;
    };

    var input2 = NaN;
    if ( ctrls[i].cfg.sensor2 !== '' ) { 
        input2 = getSensorInput( sData, ctrls[i].cfg.sensor2 );
    };
    
    if ( ( isNaN( input2 ) == false ) && ( ctrls[i].cfg.sensor2Priority > 0 ) ) {
        retVal = input1 * ( ( 100 - ctrls[i].cfg.sensor2Priority ) / 100 ) + input2 * ( ctrls[i].cfg.sensor2Priority / 100 );   
    } else {
    	retVal = input1;
    };
    //utils.log( 'Input1: ' + input1 + '\tInput2: ' + input2 + '\tretVal: ' + retVal );
    return retVal;
};

//Ctrl.getSensorInput - searches through sensorData ojbect to find correct sensor value.
//  sData = sensor data
//  sensorName = name of sensor in sData;
function getSensorInput( sData, sensorName ) {
    var sensorValue = NaN;  //Return NaN if error obtaining sensor value.
    
    //Search through sensorData using current sensor name.
    switch( sensorName ) {
        case 'temp1':  
            sensorValue = sData.temp1;
            break;
        case 'humi1':  
            sensorValue = sData.humi1;
            break;
        case 'temp2':  
            sensorValue = sData.temp2;
            break;
        case 'humi2':  
            sensorValue = sData.humi1;
            break;
        case 'onew1':  
            sensorValue = sData.onew1;
            break;
        case 'onew2':  
            sensorValue = sData.onew2;
            break;
        case 'onew3':  
            sensorValue = sData.onew3;
            break;
        case 'onew4':  
            sensorValue = sData.onew4;
            break;
        case 'onew5':  
            sensorValue = sData.onew5;
            break;
        case 'onew6':  
            sensorValue = sData.onew6;
            break;
        case 'onew7':  
            sensorValue = sData.onew7;
            break;
        case 'onew8':  
            sensorValue = sData.onew8;
            break;
        default:
            sensorValue = NaN;
            utils.log( 'Could not find sensor name ' + sensorName + ' in list of sensors.', 'green', true, false );
    };   
    //utils.log( 'sensorValue: ' + sensorValue );
    return sensorValue;
};

//Ctrl.findSetpoint - Determine setpoint using associated profile (if it exists).
//  If profile does not exist, turn off ctrl[index].useProfile flag.
//  ctrls1 - controllers JSON array.
//  index - index of current controller  
//  Returns setpoint.
Ctrl.prototype.findSetpoint = function( ctrls, index ) {
    ctrls[index].currSetpoint = ctrls[index].cfg.endSetpoint;
  
    ctrls = tprof.process( ctrls, index );
    
    return ctrls;
};

//pidInit() - sets up PID for selected controller.
//  ctrls - array of controller objects
//  i - index of current controller
Ctrl.prototype.pidInit = function( ctrls, i ) {
    if ( ( ctrls[i].cfg.coolCtrlMode == 'PID' ) || ( ctrls[i].cfg.heatCtrlMode == 'PID' ) ) {  
        utils.log( 'Setting up PID for controller ' + i + '(' + ctrls[i].cfg.name +')...', 'green', false, false );        
        //Setup PID for heating. Will change this in processActuators().
        ctrls[i].PID = new PID1( ctrls[i].input, ctrls[i].currSetpoint, ctrls[i].cfg.heatKp, ctrls[i].cfg.heatKi, ctrls[i].cfg.heatKd, PID1.DIRECT );
        PID.setMode( ctrls[i].PID, PID.AUTOMATIC );
        PID.setControllerDirection( ctrls[i].PID, PID.DIRECT );
        PID.setOutputLimits( ctrls[i].PID, -100, 100 );
        PID.setSampleTime( ctrls[i].PID, 3000 ); //Probably need to work on better timing for this.
        utils.log( 'Initialized PID parameters: ' );
        showPIDparams( ctrls, i );
    };
};

//showPIDparams() - Display PID parameters for debugging.
//  ctrls - array of controller objects
//  i - index of current controller
function showPIDparams ( ctrls, i ) {
    utils.log( 'PID parameters: ' + JSON.stringify( ctrls[i].PID ), 'green', false, false );
};

//Ctrl.processActuators - Sets actuator depending on need to cool or heat. 
//  Also, determines if in PID or hysteresis mode.
//  ctrls - controllers array of objects.
//  i - index of array pointing to current controller. 
Ctrl.prototype.processActuators = function( ctrls, i ) {

	//Skip processing if a controller needs to be reset.
	if ( ctrls[i].currState == st_RESET ) {
        return;
	};

    //Check if heat or cool is set using PID. If so, just use PID for both and skip the rest of processing.
    if ( ctrls[i].cfg.coolCtrlMode == 'PID' || ctrls[i].cfg.heatCtrlMode == 'PID' ) {
    	if( isNaN( ctrls[i].input ) === true ) {
            return;
        } else {
        	//utils.log( 'ctrls[i].input (' + ctrls[i].input + ') is a number, so processing PID.')
            this.processPID( ctrls, i );
            return; 
        };    
    };


    //Determine direction (e.g. cool or heat).
    var direction = this.getDirection( ctrls, i );

    //Set actuator based on mode (cooling, heating or idling).
    switch ( direction ) {
        case st_COOL: 
            //Cooling mode.
            //utils.log( 'Cooling on controller ' + i, 'green', false, false );

            //Check for direct state change from heating to cooling without idle.
            if ( ctrls[i].currState == st_HEAT ) {
                //Shut off current tpTimer.
                tpTimer.tpTimerKill( ctrls, i );
                
                //Turn off heating actuator.
                act.setActuator( ctrls, i, 'heat', (ctrls[i].cfg.heatUsePwm ? 0: false), false );
                //Set up delay on heating actuator.
                act.setDelay( ctrls, i, 'heat' );
            };
            
            if ( ctrls[i].cfg.coolCtrlMode == 'PID' ) {

                //Run PID loop with cool parameters.
                //ctrls[i].PID.setControllerDirection( PID.REVERSE );
                ctrls[i].PID.setTunings( ctrls[i].cfg.coolKp, ctrls[i].cfg.coolKi, ctrls[i].cfg.coolKd );
                ctrls[i].PID.setInput( ctrls[i].input );
                ctrls[i].PID.setPoint( ctrls[i].currSetpoint );
                var pidCompute = ctrls[i].PID.compute();
                if ( pidCompute ) {
                    ctrls[i].output = ctrls[i].PID.getOutput(); //Math.abs( ctrls[i].PID.getOutput() );
                    //ctrls[i].output = 50;
                } else {
                    ctrls[i].output = 0;
                };
                //utils.log( 'pidCompute: ' + pidCompute + ' - Cooling with PID: output = ' + ctrls[i].output );
                //showPIDparams( ctrls, i );

                //If PWM mode, set actuator with PWM value from PID output.
                if ( ctrls[i].cfg.coolUsePwm ) {
                    //Activate actuator in PWM mode.
                    act.setActuator( ctrls, i, 'cool', ctrls[i].output, true ); //Call setActuator() with pwm.
                } else {
                    //Use time proportioning to control actuator.
                    tpTimer.tpTimerInit( ctrls, i, 'cool' );
                };
                ctrls[i].currState = st_COOL;
             
            } else {
                //Hysteresis mode - Activate cooling actuator directly (e.g. 100% output).
                ctrls[i].output = 100; //Used for logging cooling.

                //Activate cooling.
                act.setActuator( ctrls, i, 'cool', true, false ); 
            };
            if( ctrls[i].coolDelayOn ) {
                ctrls[i].currState = st_COOLWAIT;
            } else {
                ctrls[i].currState = st_COOL;
            };
            break;
        
        case st_HEAT:
            //Heating mode.
            //utils.log( 'Heating on controller ' + i, 'green', false, false );

            //Check for direct state change from cooling to heating without idle.
            if ( ctrls[i].currState == st_COOL ) {
                //Shut off current tpTimer.
                tpTimer.tpTimerKill( ctrls, i );
                
                //Turn off cooling actuator.
                act.setActuator( ctrls, i, 'cool', (ctrls[i].cfg.coolUsePwm ? 0: false), false );
                //Set up delay on cooling actuator.
                act.setDelay( ctrls, i, 'cool' );
            };

            if ( ctrls[i].cfg.heatCtrlMode == 'PID' ) {

                //Run PID loop with heat parameters.
                //ctrls[i].PID.setControllerDirection( PID.DIRECT );
                ctrls[i].PID.setTunings( ctrls[i].cfg.heatKp, ctrls[i].cfg.heatKi, ctrls[i].cfg.heatKd );
                ctrls[i].PID.setInput( ctrls[i].input );
                ctrls[i].PID.setPoint( ctrls[i].currSetpoint );
                var pidCompute = ctrls[i].PID.compute();
                if ( pidCompute ) {
                    ctrls[i].output = ctrls[i].PID.getOutput(); //Math.abs( ctrls[i].PID.getOutput() );
                    //ctrls[i].output = 50;
                } else {
                    ctrls[i].output = 0;
                };
                //utils.log( 'pidCompute: ' + pidCompute + ' - Heating with PID: output = ' + ctrls[i].output );
                //showPIDparams( ctrls, i );

                //If PWM mode, set actuator with PWM value from PID output.
                if ( ctrls[i].cfg.heatUsePwm ) {
                    //Activate actuator in PWM mode.
                    act.setActuator( ctrls, i, 'heat', ctrls[i].output, true ); //Call setActuator() with pwm.
                } else {
                    //Use time proportioning to control actuator.
                    //Activate a new timer only if it doesn't exist already. Changes in state variables will automatically
                    //  update the tpTimer.
                    tpTimer.tpTimerInit( ctrls, i, 'heat' );
                };
             
            } else {
                //Hysteresis mode - Activate heating actuator directly (e.g. 100% output).
                ctrls[i].output = 100;

                //Activate heating.
                act.setActuator( ctrls, i, 'heat', true, false );
            };
            if( ctrls[i].heatDelayOn ) {
                ctrls[i].currState = st_HEATWAIT;
            } else {
                ctrls[i].currState = st_HEAT;
            };
            break;

        case st_IDLE:
        
            //Idling mode (within hysteresis band), so turn off pin that has been active if state changed.
            //utils.log( 'Idling on controller ' + i, 'green', false, false );

            //Turn off tpTimer if it exists.
            tpTimer.tpTimerKill( ctrls, i );

            //Turn off actuator and turn on delay.
            if ( ctrls[i].currState == st_COOL ) {
                act.setActuator( ctrls, i, 'cool', false, false );
                act.setDelay( ctrls, i, 'cool' ); 
            };
            if ( ctrls[i].currState == st_HEAT ) {
                act.setActuator( ctrls, i, 'heat', false, false );
                act.setDelay( ctrls, i, 'heat' )
            };
            ctrls[i].currState = st_IDLE;
            ctrls[i].output = 0;
            break;

        default:
            //Direction is undefined?
            //utils.log( 'Error: Not cooling, heating or idling on controller ' + i + '.', 'red', false, false );
    };     
}; 

//Ctrl.getDirection() - determines if heating or cooling is needed.
//  ctrls - controller object passed by reference.
//  i - index of current controller.
Ctrl.prototype.getDirection = function( ctrls, i ) {
    var retVal = st_OFF;
    if ( ctrls[i].input > ( ctrls[i].currSetpoint + ctrls[i].cfg.heatHys ) ) {
        //Need to start cooling.
        retVal = st_COOL;
    } else if ( ctrls[i].input < ( ctrls[i].currSetpoint - ctrls[i].cfg.coolHys ) ) {
        //Need to start heating.
        retVal = st_HEAT;
    } else {
        //Just idle.
        retVal = st_IDLE;
    };
    //utils.log( 'getDirection() - retVal = ' + retVal, 'green', false, false );
    return retVal;        
};

//Ctrl.processPID() - Controller uses PID.
//  ctrls - array of controller objects
//  i - index of current controller
//  note: hysteresis not added yet. Also, assumes that cool and heat PID parameters equivalent
Ctrl.prototype.processPID = function( ctrls, i ) {

    //utils.log( 'In processPID()...');

    //Check if pid is okay...
    //if ( typeof( ctrls[i].PID.setTunings ) === 'function' ) {
    //} else {
    //	utils.log( 'PID.setTunings is not a function. typeof(PID.setTunings): ' + typeof( ctrls[i].PID.setTunings ) );
    //};

    //Tune PID using current direction.
    if ( ctrls[i].currState == st_COOL ) {
        PID.setTunings( ctrls[i].PID, ctrls[i].cfg.coolKp, ctrls[i].cfg.coolKi, ctrls[i].cfg.coolKd );
    } else {
        PID.setTunings( ctrls[i].PID, ctrls[i].cfg.heatKp, ctrls[i].cfg.heatKi, ctrls[i].cfg.heatKd );
    };     

    if ( ctrls[i].cfg.pidAutoTune == '' ) {
        //Shut off autotuning if it was on during previous cycle and was cancelled.
        if ( autotuneOn ) {
            autoTune.autotuneStop();
            autotuneOn = false;
            utils.log( 'Autotune shutting down.', 'green', true );
        };
        //Run the PID to determine current output value.
        //utils.log( 'Running PID...');
        PID.setInput( ctrls[i].PID, ctrls[i].input );
        PID.setPoint( ctrls[i].PID, ctrls[i].currSetpoint );
        var pidCompute = PID.compute( ctrls[i].PID );
        if ( pidCompute ) {
            ctrls[i].output = PID.getOutput( ctrls[i].PID );
        } else {
            utils.log( 'PID output = 0 due to skipped processing.' );
            ctrls[i].output = 0;
        };
    } else {
        //Set flag that autotuning is on.
        autotuneOn = true;
        //Run the PID autotune function to determine output value.
        //  Output is automatically saved in ctrls[i].output.
        //utils.log( 'checkTuningStatus(): ' + autoTune.checkTuningStatus() );
        if ( autoTune.checkTuningStatus() == false ) {
            //utils.log( 'Setting up autotuning for ' + ctrls[i].cfg.pidAutoTune + ' actuator...', 'green', false );
            autoTune.setupAutotune( ctrls, i, ctrls[i].cfg.pidAutoTune );
        };
        var atState = autoTune.processAutotune( ctrls, i);
        switch ( atState ) {
            case 1: //Autotuning active.
                //utils.log( 'Autotune running. Output: ' + ctrls[i].output );
                break;
            case 2: //Autotuning finished.
                //Autotuning finished, so notify user and turn it off.
                utils.log( 'Autotuning completed', 'green', true, false );
                ctrls[i].cfg.pidAutoTune = '';
                break;
            case 0: //Autotuning skipped.
                utils.log( 'Autotuning skipped.' );
                break;
            default:
        };
    };
   
    var direction = st_IDLE;
    if ( ctrls[i].output < 0 ) {
        direction = st_COOL;
    } else if ( ctrls[i].output > 0 ) {
        direction = st_HEAT;
    } else {
        direction = st_IDLE;
    };

    //utils.log( 'PID Direction: ' + direction, 'green', false, false )

    switch( direction ) {

        case st_COOL:    
            //ctrls[i].setTunings( ctrls[i].cfg.coolKp, ctrls[i].cfg.coolKi, ctrls[i].cfg.coolKd );

            //Check for direct state change. If so, kill the tpTimer, turn off heating actuator and start over with new output value.
            if ( ctrls[i].currState == st_HEAT ) {
                //Shut off current tpTimer.
                tpTimer.tpTimerKill( ctrls, i );
                
                //Turn off heating actuator.
                act.setActuator( ctrls, i, 'heat', (ctrls[i].cfg.heatUsePwm ? 0: false), ctrls[i].cfg.heatUsePwm );

                //Set up delay on heating actuator.
                act.setDelay( ctrls, i, 'heat' );

                //Initialize ITerm to minimize overshoot.
                //ctlrs[i].PID.ITerm = 0;
            };
            //Set up tpTimer with output value. Need to check for PWM output.
            tpTimer.tpTimerInit( ctrls, i, 'cool' ); 
            
            ctrls[i].currState = st_COOL;

            //Set tuning to cool for next round.
            //ctrls[i].PID.setTunings( ctrls[i].cfg.coolKp, ctrls[i].cfg.coolKi, ctrls[i].cfg.coolKd ); 
            break;

        case st_HEAT:
            //ctrls[i].setTunings( ctrls[i].cfg.heatKp, ctrls[i].cfg.heatKi, ctrls[i].cfg.heatKd );

            //Check for direct state change. If so, kill the tpTimer, turn off cooling actuator and start over with new output value.
            if ( ctrls[i].currState == st_COOL ) {
                //Shut off current tpTimer.
                tpTimer.tpTimerKill( ctrls, i );
                
                //Turn off cooling actuator.
                act.setActuator( ctrls, i, 'cool', (ctrls[i].cfg.coolUsePwm ? 0: false), ctrls[i].cfg.coolUsePwm );

                //Set up delay on cooling actuator.
                act.setDelay( ctrls, i, 'cool' );

                //Initialize ITerm to minimize overshoot.
                //ctlrs[i].PID.ITerm = 0;

            };
            //Set up tpTimer with output value.
            tpTimer.tpTimerInit( ctrls, i, 'heat' ); 

            ctrls[i].currState = st_HEAT;

            //Set tuning to heat for next round.
            //ctrls[i].PID.setTunings( ctrls[i].cfg.heatKp, ctrls[i].cfg.heatKi, ctrls[i].cfg.heatKd ); 
            break;

        case st_IDLE:
            if( ctrls[i].currState == st_COOL ) {
                //Shut off tpTimer
                tpTimer.tpTimerKill( ctrls, i );

                //Turn off cooling actuators.
                act.setActuator( ctrls, i, 'cool', ( ctrls[i].cfg.coolUsePwm ? 0: false), ctrls[i].cfg.coolUsePwm );
            };

            if( ctrls[i].currState == st_HEAT ) {
                //Shut off tpTimer
                tpTimer.tpTimerKill( ctrls, i );

                //Turn off cooling actuators.
                act.setActuator( ctrls, i, 'heat', (ctrls[i].cfg.heatUsePwm ? 0: false), ctrls[i].cfg.coolUsePwm );
            };

            //Initialize ITerm to minimize overshoot.
            //ctrls[i].PID.ITerm = 0;

            ctrls[i].currState = st_IDLE;
            break;

        default:
            utils.log( 'Unable to determine current state in PID mode.', 'red', true, false );
    };

    showPIDparams( ctrls, i );
    
};


//Ctrl.writeToLogFile() - Write data to file if logFileName provided and logging is active.
//  ctrls - controller array
//  i - index for current controller
Ctrl.prototype.writeToLogFile = function( ctrls, i ) {
    
    var logFileName1 = logFilePath + ctrls[i].cfg.logFileName
    if ( ( ctrls[i].cfg.logData == true ) && ( ctrls[i].cfg.logFileName !== '') ) {
        if (VERBOSE) { utils.log( 'Writing data to ' + ctrls[i].cfg.logFileName, 'green', true, false ) };        
 
        //Assemble data in CSV format (date/time, input value from sensor, current setpoint, heat/humi state, cool/dehumi state)
        var csvData = utils.getDateTime() + ',';
        csvData += ctrls[i].input.toFixed(2) + ',';
        csvData += ctrls[i].currSetpoint.toFixed(2) + ',';
        csvData += ( ( ctrls[i].currState == st_HEAT || ctrls[i].currState == st_HUMI ) ? Math.abs( st_marker*ctrls[i].output/100 ) : NaN ) + ',';
        csvData += ( ( ctrls[i].currState == st_COOL || ctrls[i].currState == st_DEHUM ) ? Math.abs( st_marker*ctrls[i].output/100 ) : NaN ); 
  
        //If file does not exist, add a comment with parameters to parse on client side.
        fs.access( logFileName1, fs.F_OK, function( error ) {
            if( !error ) {
                //Append csvData to file. 
                csvData += '\n';
                fs.appendFile( logFileName1, csvData, 'utf8', function(err) {
                    if (err) {
                        utils.log( 'Unable to write to controller logfile ' + logFileName1 + '. Error: ' + err, 'green', true, false );
                        ctrls[i].cfg.logData = false;  //Turn off logging to prevent recurrent errors.
                    };
                });
            } else {
                //File does not exist, so first record includes comment with controller parameters used for dygraphs (title, etc).
                csvData += '\n';
                //csvData += ' # @%' + JSON.stringify( ctrls[i] ) + '\n';

                //Now append csvData to file (this will create the file with first record). 
                fs.appendFile( logFileName1, csvData, 'utf8', function(err) {
                    if (err) {
                        utils.log( '\Unable to write to controller logfile ' + logFileName1 + '. Error: ' + err, 'green', true, false );
                        ctrls[i].cfg.logData = false;  //Turn off logging to prevent recurrent errors.
                    };
                });
            };
        });    
    };
}; 

module.exports = new Ctrl();
