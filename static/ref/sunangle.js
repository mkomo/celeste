
/////////////////////////////////////////////
// sunangle.js
// Copyright 2006, 1995 Sustainable By Design
/////////////////////////////////////////////


/////////////
// GLOBALS //
/////////////

var showedLongitudeMeridianWarning = false;


///////////////////////////
// CHECK INPUTS FUNCTION //
///////////////////////////

function CheckInputs () {

	var error = false;

	var error_message = "The following inputs must be corrected before the sun angles can be calculated:\n\n";

	var f = document.theForm;

	var inputLatitude   = f.inputLatitude.value;
	var inputLongitude  = f.inputLongitude.value;
	var inputTime       = f.inputTime.value;
	var inputElevation  = f.inputElevation.value;
	
	// LATITUDE

	var latitudeOkay = false;

	if (inputLatitude.search ("^[0-9]+[dD][0-9]+[mM][0-9]+[sS]$") > -1) { latitudeOkay = true; }
	
	else { if ((inputLatitude >= 0 ) && (inputLatitude <= 90)) { latitudeOkay = true; } }

	if (! latitudeOkay) {
		
		error_message = error_message + "* The latitude must be between 0 and 90 degrees (click on the latitude label for details)\n";
		
		error = true;
	}
	
	// LONGITUDE

	var longitudeOkay = false;

	if (inputLongitude.search ("^[0-9]+[dD][0-9]+[mM][0-9]+[sS]$") > -1) { longitudeOkay = true; }
	
	else { if ((inputLongitude >= 0 ) && (inputLongitude <= 360)) { longitudeOkay = true; } }

	if (! longitudeOkay) {
		
		error_message = error_message + "* The longitude must be between 0 and 360 degrees (click on the longitude label for details)\n";
		
		error = true;
	}

	// ELEVATION

	if ((inputElevation != '') && (inputElevation.search ("[^0-9]") > -1)) {
		
		error_message = error_message + "* The elevation must contain only numbers (click on the elevation label for details)\n";
		
		error = true;
	}
	
	// TIME
	
	if ((inputTime != '') && (inputTime.search ("^[0-9]+:?[0-9][0-9]$") < 0)) {
		
		error_message = error_message + "* Time must be in the format 12:00 or 1200\n";
		
		error = true;
	}

	// ALERT / RETURN

	if (error == true) { alert (error_message); }

	return (! error);
}


///////////////////////////
// MAIN COMPUTE FUNCTION //
///////////////////////////

function compute () {

	if (CheckInputs ()) {

		var f = document.theForm;
		
		// constants
		
		var       degreesToRadians =    3.1416 /  180.0000;
		var       radiansToDegrees =  180.0000 /    3.1416;
		var           feetToMeters =    1.0000 /    3.2800;
		var degreeMinutesToDecimal =    1.0000 /   60.0000;
		var degreeSecondsToDecimal =    1.0000 / 3600.0000;				
	
		// retrieve input values
		
		var inputLongitude   = f.inputLongitude.value;
		var inputEastWest    = f.inputEastWest.options[f.inputEastWest.selectedIndex].text;
		var inputLatitude    = f.inputLatitude.value;
		var inputNorthSouth  = f.inputNorthSouth.options[f.inputNorthSouth.selectedIndex].text;
		var inputElevation   = f.inputElevation.value;
		var inputFeetMeters  = f.inputFeetMeters.options[f.inputFeetMeters.selectedIndex].text;
		var inputMonth       = f.inputMonth.options[f.inputMonth.selectedIndex].text;
		var inputDate        = f.inputDate.options[f.inputDate.selectedIndex].text - 0;
		var inputYear        = f.inputYear.options[f.inputYear.selectedIndex].text - 0;
		var inputTime        = f.inputTime.value;
		var inputAMPM        = f.inputAMPM.options[f.inputAMPM.selectedIndex].text;
		var inputTimeFormat  = f.inputTimeFormat.options[f.inputTimeFormat.selectedIndex].text;
		var inputTimeZone    = f.inputTimeZone.options[f.inputTimeZone.selectedIndex].value - 0;
		var inputDaylight    = f.inputDaylight.options[f.inputDaylight.selectedIndex].text;
		var inputZeroAzimuth = f.inputZeroAzimuth.options[f.inputZeroAzimuth.selectedIndex].value - 0;

		// convert longitude and latitude to decimal from DMS if necessary
		
		if (inputLongitude.indexOf("d") != -1) {
		
			degMarker = inputLongitude.indexOf("d");
			minMarker = inputLongitude.indexOf("m");
			secMarker = inputLongitude.indexOf("s");
	
			longitudeDeg = inputLongitude.substr(0,degMarker)                       - 0;
			longitudeMin = inputLongitude.substr(degMarker+1,minMarker-degMarker-1) - 0;
			longitudeSec = inputLongitude.substr(minMarker+1,secMarker-minMarker-1) - 0;
			
			inputLongitude = longitudeDeg + (longitudeMin * degreeMinutesToDecimal) + (longitudeSec * degreeSecondsToDecimal);
		}
		else { inputLongitude -= 0; }
		
		if (inputLatitude.indexOf("d") != -1) {
		
			degMarker = inputLatitude.indexOf("d");
			minMarker = inputLatitude.indexOf("m");
			secMarker = inputLatitude.indexOf("s");
	
			LatitudeDeg = inputLatitude.substr(0,degMarker)                       - 0;
			LatitudeMin = inputLatitude.substr(degMarker+1,minMarker-degMarker-1) - 0;
			LatitudeSec = inputLatitude.substr(minMarker+1,secMarker-minMarker-1) - 0;
			
			inputLatitude = LatitudeDeg + (LatitudeMin * degreeMinutesToDecimal) + (LatitudeSec * degreeSecondsToDecimal);
		}
		else { inputLatitude -= 0; }
		
		// check validity of input values
		
		var validInputTime   = true;
	
		// avoid math errors due to latitude or longitude = 0
		
		if ((inputLatitude  == 0) && (f.inputLatitude.value.length  > 0)) { inputLatitude  = 0.000000001; }
		if ((inputLongitude == 0) && (f.inputLongitude.value.length > 0)) { inputLongitude = 0.000000001; }

		// check which input fields were filled in by user
		
		var timeEntered      = (inputTime      != "");
		var latitudeEntered  = (inputLatitude  != "");
		var longitudeEntered = (inputLongitude != "");
		
		// convert input strings to numbers
		
		inputLatitude  = inputLatitude  - 0;
		inputLongitude = inputLongitude - 0;
		inputElevation = inputElevation - 0;
		
		// determine time formats
	
		var clockTimeInputMode = (inputTimeFormat == "Clock time");
		var lsotInputMode      = (inputTimeFormat == "Solar time");
	
		// determine what's do-able
		
		var doableDeclination = true;
		var doableEOT         = true;
		var doableClockTime   = ((longitudeEntered || clockTimeInputMode) && timeEntered);
		var doableLSOT        = ((longitudeEntered ||      lsotInputMode) && timeEntered);
		var doableHourAngle   = (longitudeEntered && timeEntered);
		var doableSunRiseSet  = (longitudeEntered && latitudeEntered);
		var doableAltitude    = (longitudeEntered && timeEntered && latitudeEntered);
		var doableAzimuth     = (longitudeEntered && timeEntered && latitudeEntered);


		// //////////// //
		// CALCULATIONS //
		// //////////// //

			// CONVERT UNITS
			
		// longitude east-west adjustment
		
		if (longitudeEntered) {
			var signedLongitude = inputLongitude;
			if (inputEastWest == "East") signedLongitude *= -1;      // [0] = east, [1] = west
		}
		
		// latitude north-south adjustment
		
		if (latitudeEntered) {
			var signedLatitude = inputLatitude;
			if (inputNorthSouth == "South") signedLatitude *= -1;      // [0] = north, [1] = south
		}
		
		// fix longitude > 180 deg
		
		if (signedLongitude > 180) {
		
			signedLongitude = signedLongitude - 360;
		}

		// fix longitude < -180 deg
		
		if (signedLongitude < -180) {
		
			signedLongitude = signedLongitude + 360;
		}

		// calculate daylight savings time adjustment
	
		var daylightAdjustment = 0;

		if (inputDaylight == "Yes") daylightAdjustment = 1;
		
		// convert elevation units if necessary
		
		if (inputFeetMeters == "feet") { inputElevation *= feetToMeters; }
		
		// set zero azimuth
		
		zeroAzimuth = inputZeroAzimuth;

		// local standard time meridian
		
		var meridian = inputTimeZone * -15;
		
		// alert if laongitude differs too much from time zone
		
		var longitudeMeridianDifference = signedLongitude  - meridian;
	
		if ((! showedLongitudeMeridianWarning) && ((longitudeMeridianDifference > 30) || (longitudeMeridianDifference < -30))) {
		
			alert ("Warning:  The longitude differs from the center of the selected time zone by more than 30 degrees.  This may be correct, or it may indicate that one of those two inputs is incorrect.\n\nPlease click on the 'time zone' input for more information.\n\n(You will not be shown this warning again.)");
			
			showedLongitudeMeridianWarning = true;
		}
		
			// CALCULATE TIMES
			
		// convert input time to hours after midnight
		
		if (validInputTime) {
			
			// ...remove semicolon from time string if necessary
			
			inputTime = RemoveSemicolon (inputTime);
		
			// ...parse time input string and get hours and minutes
				
			if (inputTime.length == 4) {                          // like "1234"
				timeHours = inputTime.substring(0,2) - 0;
				timeMinutes = inputTime.substring(2,4) - 0;
			}
			else {                                                // like "123"
				timeHours = inputTime.substring(0,1) - 0;
				timeMinutes = inputTime.substring(1,3) - 0;
			}
			
			// ...adjust for AM/PM designation
			
			if ((inputAMPM == "AM") && (timeHours == 12)) timeHours = 0;
			if  (inputAMPM == "PM") { if (timeHours != 12) timeHours += 12; }
		
			// ...calculate clock minutes after midnight
			
			var inputHoursAfterMidnight   = timeHours + timeMinutes / 60.0;
			var inputMinutesAfterMidnight = timeHours * 60.0 + timeMinutes;
		}
		
		// calculate Universal Time
		
		var UT = 0.0;

		if (validInputTime) { UT = inputHoursAfterMidnight - inputTimeZone - daylightAdjustment; }

		var monthNum = (MonthStringToMonthNum (inputMonth)) - 0;

		if (monthNum > 2) {
			correctedYear = inputYear;
			correctedMonth = monthNum - 3;
		}
		else {
			correctedYear = inputYear - 1;
			correctedMonth = monthNum  + 9;
		}

		var t = ((UT / 24.0) + inputDate + Math.floor (30.6 * correctedMonth + 0.5) + Math.floor (365.25 * (correctedYear - 1976)) - 8707.5) / 36525.0;

		var G = 357.528 + 35999.05 * t;
		G = NormalizeTo360 (G);
	
		var C = (1.915 * Math.sin (G * degreesToRadians)) + (0.020 * Math.sin (2.0 * G * degreesToRadians));
		
		var L = 280.460 + (36000.770 * t) + C;
		L = NormalizeTo360 (L);
		
		var alpha = L - 2.466 * Math.sin (2.0 * L * degreesToRadians) + 0.053 *  Math.sin (4.0 * L * degreesToRadians);
		
		var GHA = UT * 15 - 180 - C + L - alpha;
		GHA = NormalizeTo360 (GHA);

		var obliquity = 23.4393 - 0.013 * t;
		
		var declination = Math.atan (Math.tan (obliquity * degreesToRadians) * Math.sin (alpha * degreesToRadians)) * radiansToDegrees;

		f.outputDeclination.value = FormatFloatString (declination);
	
		var eotAdjustment = (L - C - alpha) / 15.0;  // EOT adjustment in hours
		
		f.outputEOT.value = FormatFloatString (eotAdjustment);

		if (doableLSOT || doableClockTime) {

			var clockTimeToLSOTAdjustment = ((signedLongitude - meridian) / 15.0) - eotAdjustment + daylightAdjustment;   // in hours
		}

		var solarHourAngle = 0;
		
		if (clockTimeInputMode) { solarHourAngle = GHA - signedLongitude; }
		
		else { solarHourAngle = 15 * (inputHoursAfterMidnight - 12); }
		
		solarHourAngle = NormalizeTo180 (solarHourAngle);
		
		var apparentSolarTime = 0;
		
		if (clockTimeInputMode) { apparentSolarTime = NormalizeTo24 (12 + solarHourAngle / 15.0); }
		
		else { apparentSolarTime = inputHoursAfterMidnight; }

		if (doableLSOT) {
		
			if (clockTimeInputMode) {
			
				solarMinutesAfterMidnight = inputMinutesAfterMidnight - (clockTimeToLSOTAdjustment * 60.0);
			
				var whichDay = 0;
				
				if (solarMinutesAfterMidnight < 0) {           // it's the day before
					solarMinutesAfterMidnight += 24 * 60;
					whichDay = -1;
				}
				
				if (solarMinutesAfterMidnight >= 24 * 60) {    // it's the next day
					solarMinutesAfterMidnight -= 24 * 60;
					whichDay = 1;
				}
			}
			
			else {
			
				solarMinutesAfterMidnight = inputMinutesAfterMidnight;
				
				whichDay = 0;
			}
			
			solarTime = MinutesToClockTime (solarMinutesAfterMidnight, inputAMPM);
			
			if (whichDay == "-1") f.outputLSOT.value = solarTime + "-";
			if (whichDay ==  "0") f.outputLSOT.value = solarTime      ;
			if (whichDay ==  "1") f.outputLSOT.value = solarTime + "+";
		}

		else { f.outputLSOT.value = ""; }
		
		if (doableClockTime) {
		
			var clockMinutesAfterMidnight = inputMinutesAfterMidnight;
			
			if (lsotInputMode) { clockMinutesAfterMidnight = inputMinutesAfterMidnight + (clockTimeToLSOTAdjustment * 60.0); }
		
			var whichDay = 0;
			
			if (clockMinutesAfterMidnight < 0) {           // it's the day before
				clockMinutesAfterMidnight += 24 * 60;
				whichDay = -1;
			}
			
			if (clockMinutesAfterMidnight >= 24 * 60) {    // it's the next day
				clockMinutesAfterMidnight -= 24 * 60;
				whichDay = 1;
			}
			
			clockTime = MinutesToClockTime (clockMinutesAfterMidnight, inputAMPM);
			
			if (whichDay == "-1") f.outputClockTime.value = clockTime + "-";
			if (whichDay ==  "0") f.outputClockTime.value = clockTime      ;
			if (whichDay ==  "1") f.outputClockTime.value = clockTime + "+";
		}
		
		else { f.outputClockTime.value = ""; }
		
		// hour angle
		
		if (doableHourAngle) {
			var hourAngle = (solarMinutesAfterMidnight - 12 * 60) / 4 * -1;
			f.outputHourAngle.value = FormatFloatString (hourAngle);
		}
		
		else { f.outputHourAngle.value = ""; }
		
		// altitude angle

		if (doableAltitude) {	

			var altitudeAngle = radiansToDegrees  * ArcSin (
				(Math.sin (signedLatitude         * degreesToRadians)  *
				 Math.sin (declination            * degreesToRadians)) -
				(Math.cos (signedLatitude         * degreesToRadians)  *
				 Math.cos (declination            * degreesToRadians)  *
				 Math.cos ((solarHourAngle + 180) * degreesToRadians)));
		
			f.outputAltitude.value = FormatFloatString (altitudeAngle);
		}

		else { f.outputAltitude.value = ""; }
		
		// azimuth angle
		
		if (doableAzimuth) {
		
			var preAzimuthAngle = radiansToDegrees * ArcCos (
				(Math.cos (declination    * degreesToRadians)   *
				((Math.cos (signedLatitude * degreesToRadians)   *
				 Math.tan (declination    * degreesToRadians))   +
				 (Math.sin (signedLatitude * degreesToRadians)   *
				 Math.cos ((solarHourAngle + 180)            * degreesToRadians)))) /
				 Math.cos (altitudeAngle  * degreesToRadians));
				 
			if ((hourAngle > 0) && (hourAngle < 180)) { azimuthAngle = (360.0 - preAzimuthAngle) + (zeroAzimuth - 180.0); }

			else { azimuthAngle = preAzimuthAngle + (zeroAzimuth - 180.0); }

			f.outputAzimuth.value = FormatFloatString (azimuthAngle);
		}

		else { f.outputAzimuth.value = ""; }
		
		// clock time of sunrise & sunset
		
		if (doableSunRiseSet) {
		var sunRiseSetLSoTMinutes = radiansToDegrees * ArcCos ( -1.0 *
			(Math.sin (signedLatitude * degreesToRadians) *
			Math.sin (declination    * degreesToRadians) - 
			Math.sin ((-0.8333 - 0.0347 * Math.sqrt (inputElevation)) * degreesToRadians)) /
			Math.cos (signedLatitude * degreesToRadians) /
			Math.cos (declination    * degreesToRadians)) * 4;

			f.outputSunrise.value = MinutesToClockTime ((12 * 60 - sunRiseSetLSoTMinutes + (clockTimeToLSOTAdjustment * 60)), inputAMPM);
		
			f.outputSunset.value  = MinutesToClockTime ((12 * 60 + sunRiseSetLSoTMinutes + (clockTimeToLSOTAdjustment * 60)), inputAMPM);		
		}
		else {
			f.outputSunrise.value = "";
			f.outputSunset.value = "";		
		}
	}	
		
	// zero out form outputs if inputs were invalid
	
	else {

		var f = document.theForm;
			
		f.outputAltitude.value = '';
		f.outputAzimuth.value = '';
		f.outputDeclination.value = '';
		f.outputEOT.value = '';
		f.outputClockTime.value = '';
		f.outputSunrise.value = '';
		f.outputSunset.value = '';
		f.outputLSOT.value = '';	
		f.outputHourAngle.value = '';	
	}

}


////////////////////////////////////////////////////////////////////////////////////
//  OTHER FUNCTIONS  
////////////////////////////////////////////////////////////////////////////////////

function NoEnter () {

	return !(window.event && window.event.keyCode == 13);
}

function ArcSin (theThing) {

	return (Math.asin (theThing));
}
	

function ArcCos (theThing) {

	return (Math.acos (theThing));
}


function MinutesToClockTime (totalMinutes, amPM) {

	var theHours = Math.floor (totalMinutes / 60);
	
	var theMinutes = Math.floor (totalMinutes % 60);

	if (theMinutes < 10) theMinutes = "0" + theMinutes;  // add leading "0" if necessary
	
	if (amPM == "24 hr") {
		if (theHours < 10) theHours = "0" + theHours;  // add leading "0" if necessary
		returnString = theHours + "" + theMinutes;
	}
	
	else {
		if (theHours < 12) {
			if (theHours == 0) theHours = 12;
			returnString = theHours + ":" + theMinutes + "am";
		}
		else {
			if (theHours == 12) theHours = 24;
			returnString = (theHours - 12) + ":" + theMinutes + "pm"
		}
	}
	
	return (returnString);
}


function NormalizeTo360 (theThing) {

	return (theThing - Math.floor (theThing / 360.0) * 360);
}


function NormalizeTo180 (theThing) {

	theThing = NormalizeTo360 (theThing);

	if (theThing > 180) { theThing = theThing - 360; }

	return (theThing);
}


function NormalizeTo24 (theThing) {

	return (theThing - Math.floor (theThing / 24.0) * 24);
}


function MonthStringToDays (whichMonth) {

	if (whichMonth == "Jan") return   (0);
	if (whichMonth == "Feb") return  (31);
	if (whichMonth == "Mar") return  (59);
	if (whichMonth == "Apr") return  (90);
	if (whichMonth == "May") return (120);
	if (whichMonth == "Jun") return (151);
	if (whichMonth == "Jul") return (181);
	if (whichMonth == "Aug") return (212);
	if (whichMonth == "Sep") return (243);
	if (whichMonth == "Oct") return (273);
	if (whichMonth == "Nov") return (304);
	if (whichMonth == "Dec") return (334);
		
	return ("Zeke the Solar Cat"); // you can't get here but I swear it made me do this
}


function MonthStringToMonthNum (whichMonth) {

	if (whichMonth == "Jan") return  (1);
	if (whichMonth == "Feb") return  (2);
	if (whichMonth == "Mar") return  (3);
	if (whichMonth == "Apr") return  (4);
	if (whichMonth == "May") return  (5);
	if (whichMonth == "Jun") return  (6);
	if (whichMonth == "Jul") return  (7);
	if (whichMonth == "Aug") return  (8);
	if (whichMonth == "Sep") return  (9);
	if (whichMonth == "Oct") return (10);
	if (whichMonth == "Nov") return (11);
	if (whichMonth == "Dec") return (12);
		
	return ("Zeke the Solar Cat"); // you can't get here but I swear it made me do this
}

function RemoveSemicolon (inputString) {

	// if second or third character is a semicolon, remove it (need to
	// do better error checking on input soon)
	
	if (inputString.substring (1,2) == ":") {
		return (inputString.substring(0,1) + inputString.substring(2,4));
	}

	if (inputString.substring (2,3) == ":") {
		return (inputString.substring(0,2) + inputString.substring(3,5));
	}

	return (inputString);
}

function FormatFloatString (theInput) {

	var negativeNumber = false;
	if (theInput < 0) {
		negativeNumber = true;
		theInput *= -1;
	}

	integerPortion = Math.floor (theInput); 
	decimalPortion = Math.round (theInput * 100) % 100;

	// added 7/17/99 to correct problem with 0.999 being rounded to 0.000 in decimal conversion:
	if ((decimalPortion == 0) && ((theInput - integerPortion) > 0.5)) {
		integerPortion += 1;
	}
	
	if (integerPortion < 10) integerPortionString = " " + integerPortion;   // add a space at beginning if necessary
 	else integerPortionString = "" + integerPortion;
        
	if (decimalPortion < 10) decimalPortionString = "0" + decimalPortion;   // add a leading zero if necessary
	else decimalPortionString = "" + decimalPortion;
	
	if (negativeNumber == true) return ("-" + integerPortionString + "." + decimalPortionString);
	else return (" " + integerPortionString + "." + decimalPortionString);
}
