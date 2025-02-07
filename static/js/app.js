//Define State variables
let IS_RECORDING = false;
const DEFAULT_SAVE_DIRECTORY = ''
let CONTROL_MODE = 'MAN'

// Define the components of the system
const components = {
    'MFC1': new MFC('MFC1', '/MFC1'),
    'MFC2': new MFC('MFC2', '/MFC2'),
    'SHT1': new Sensor('SHT1', '/SHT1'),
    'SHT2': new Sensor('SHT2', '/SHT2'),
    'PS1': new DAQ('PS1', '/PS1'),
    'humidity_setpoint': new HumiditySetpoint('Humidity Setpoint', '/humidity_setpoint'),
    'test1': new DAQ('Test1', '/test1'),
    'test2': new DAQ('Test2', '/test2'),
    'test3': new DAQ('Test3', '/test3'),
};

// Initialize the plots
const plots = {
    'main_plot': new ScrollingPlot('Humidity', 'flowPlot_main', 100),
    'subplot1': new ScrollingPlot('MFC 1 Params', 'flowPlot_sub1', 100),
    'subplot2': new ScrollingPlot('MFC 2 Params', 'flowPlot_sub2', 100),
    'subplot3': new ScrollingPlot('Pressure Sensor', 'flowPlot_sub3', 100, yRange='auto'),
};

// Setup the site
$(document).ready(function() {

    setupSite(); // Setup the site

    $('#dataRecordingFile').val(DEFAULT_SAVE_DIRECTORY); // Set the default save directory

    // Event listeners for the control buttons
    //Button to show the arbitrary flow modal
    $('#arbitrarySetpointModal-Button').click(() => {
        $('#arbitrarySetpointModal').modal('show');
        console.log('Arbitrary Flow Button Clicked');
    });

    $('#reinitializePlotsButton').click(initPlots); // Reinitialize the plots

    //CONTROL MODE BUTTONS~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    //Radio buttons for control mode
    $('#setpointControlButton').change(handleSetpointControlButton);
    $('#manualControlButton').change(handleManualControlButton);
    $('#arbitraryControlButton').change(handleArbitraryControlButton);
    $('#controlSettings-submitButton').click(handleControlSubmitButton); //Submit the control settings

    $('#startRecordingButton').click(handleStartRecordingButton);       //Form submission for saving the file and recording data
    $('#stopRecordingButton').click(handleStopRecordingButton);       //Stop the recording


    // Handle the buttons for adding and deleting rows
    $('#add-segment-row').click(() => handleAddSegmentRow());
    handleAddSegmentRow(); handleAddSegmentRow(); //Add 2 rows, for default 3

    // Delegate click event for removing segment rows
    $(document).on('click', '.remove-segment-row', function() {
        $(this).closest('.segment-row').remove();
    });

    // Submit button click event
    $('#plot-segments').click(handlePlotSegmentsButton);

    //Event listeners for the modal form submission
    $('#sensorForm').submit((e) => {
        e.preventDefault(); // Prevent the default form submission
    });
    $('#controlForm').submit((e) => {
        e.preventDefault(); // Prevent the default form submission
    });
    $('#mfcForm').submit((e) => {
        e.preventDefault(); // Prevent the default form submission
    });
    $('#saveFileForm').submit((e) => {
        e.preventDefault(); // Prevent the default form submission
    });

    console.log('Document Ready');
});

// Loop function to refresh the site
setInterval(async () => {
    const frameData = await getData();
    updatePlots(frameData);
    updateDiagramText(frameData);
    updateConnectionStatus();
}, 1500); 


// --------------------------------
// FUNCTIONS    
// ----------------------------
async function setupSite() {
    // Draw the Flow Diagram for the system
    drawFlowDiagram();

    // Update the status of the system
    //Check the connection status of the components, the function will also update the HTML status
    for (let key in components) {
        components[key].checkConnection();
    }

    // Fetch data from all the components, initialize the plots
    const frameData = await getData();
    initPlots(frameData);

    // Update the recording status
    // TODO: Check if the system is recording data
    updateDiagramText(frameData);
    updateRecordingStatusHTML();
    updateControlMode();
    
}

async function initPlots(frameData) {
    plots['main_plot'].initializePlot( processMainplot(frameData) );
    plots['subplot1'].initializePlot( processSubplot1(frameData) );
    plots['subplot2'].initializePlot( processSubplot2(frameData) );
    plots['subplot3'].initializePlot( processSubplot3(frameData) );
}

async function updatePlots(frameData){
    try {
        plots['main_plot'].updatePlot( processMainplot(frameData) );
    } catch (error) {    }

    try {
        plots['subplot1'].updatePlot( processSubplot1(frameData) );
    } catch (error) {    }

    try {
        plots['subplot2'].updatePlot( processSubplot2(frameData) );
    } catch (error) {    }

    try {
        plots['subplot3'].updatePlot( processSubplot3(frameData) );
    } catch (error) {    }
}

// Update the connection status of the components
function updateConnectionStatus() {
    for (let key in components) {
        components[key].checkConnection();
    }
}

function updateControlMode() {
    // Get the control mode from the server
    fetch('/get_current_control')
    .then(response => response.json())
    .then(data => {
        // Update the control mode alert
        console.log("Control Mode:", data);
        updateControlModeDisplay(data);
    });
}

// Update the text of the diagram
function updateDiagramText(frameData) {
    //FrameData has the polled data of all components, get the last set of values from each component
    for (let key in components) {
        const data = frameData[key];
        const lastValues = Object.fromEntries(
            Object.entries(data).map(([property, value]) => [property, value.values[value.values.length - 1]])
        );

        // Submit the last set of values to the update function of the component
        components[key].updateDiagramText(lastValues);
    }
}

async function getData(){
    // Fetch data from all the components
    data = {};
    for (let key in components) {
        data[key] = await components[key].fetchData();
    }
    return data;
}

//Process the data to be plotted, basically extract the relevant data from the frameData.
//This defines what each plot will show
function processMainplot(frameData) {
    data = {
            humidity_setpoint:  {data: frameData['humidity_setpoint']['humidity_setpoint'], 
                                marker: {color: 'black',
                                        size: 15,
                                        symbol: 'circle' }},
            SHT1_temperature:   {data: frameData['SHT1']['temperature'], 
                                marker: {color: 'red',
                                        size: 8,
                                        symbol: 'triangle-up' }},
            SHT1_humidity:      {data: frameData['SHT1']['humidity'], 
                                marker: {color: 'blue',
                                        size: 8,
                                        symbol: 'square' }},
            SHT2_temperature:   {data: frameData['SHT2']['temperature'], 
                                marker: {color: 'red',
                                        size: 8,
                                        symbol: 'triangle-down' }},
            SHT2_humidity:      {data: frameData['SHT2']['humidity'], 
                                marker: {color: 'blue',
                                        size: 8,
                                        symbol: 'diamond' }},
            test1_y1:           {data: frameData['test1']['y1'], 
                                marker: {color: 'red',
                                        size: 8,
                                        symbol: 'x' }},
            test1_y2:           {data: frameData['test1']['y2'], 
                                marker: {color: 'blue',
                                        size: 8,
                                        symbol: 'square' }},
    };
    
    // Calculate the error between the setpoint and the humidity, only 
    // if the setpoint is available.  Add to the data object
    if (frameData['humidity_setpoint']['humidity_setpoint'] != undefined) {
        const datetime = frameData['humidity_setpoint']['humidity_setpoint']['datetime'];
        const setpoint = frameData['humidity_setpoint']['humidity_setpoint']['values'];
        const humidity = frameData['SHT1']['humidity']['values'];
        
        // Calculate the error
        const min_length = Math.min(setpoint.length, humidity.length);
        let vals = new Array(min_length);
        for (let i = 0; i < min_length; i++) {
            vals[i] = humidity[i] - setpoint[i] + 50;
        }
        const err_data = {'datetime': datetime.slice(0, min_length), 'values': vals};
        data['setpoint_error'] = {data: err_data, 
                        marker: {color: 'green',
                                size: 8,
                                symbol: 'circle' }
                        };
    }


    return data;
}

function processSubplot1(frameData) {
    data = {
        MFC1_setpoint: {data: frameData['MFC1']['setpoint'],
                        marker: {color: 'black',
                                size: 8,
                                symbol: 'circle' }},
        MFC1_pressure: {data: frameData['MFC1']['pressure'],
                        marker: {color: 'green',
                                size: 8,
                                symbol: 'diamond' }},
        MFC1_temperature: {data: frameData['MFC1']['temperature'],
            marker: {color: 'red',
                    size: 8,
                    symbol: 'square' }},
        MFC1_flowrate: {data: frameData['MFC1']['mass_flow'], 
            marker: {color: 'blue',
                    size: 6,
                    symbol: 'x' }},
    };
    return data;
}

function processSubplot2(frameData) {
    data = {
        MFC2_setpoint: {data: frameData['MFC2']['setpoint'],
                        marker: {color: 'black',
                                size: 8,
                                symbol: 'circle' }},
        MFC2_pressure: {data: frameData['MFC2']['pressure'],
                        marker: {color: 'green',
                                size: 8,
                                symbol: 'diamond' }}, 
    };
    return data;
}

function processSubplot3(frameData) {
    console.log(frameData);
    data = {
        PS1: {data: frameData['PS1']['pressure'],
                        marker: {color: 'red',
                                size: 10,
                                symbol: 'circle' }},
    };
    return data;
}


function pairMarker(data, marker){
    return {'data': data, 'marker': marker};
}



// Draw the Flow Diagram for the system
function drawFlowDiagram() {
    paper.setup('FlowDiagram');

    let MFC1 = components['MFC1'];
    let MFC2 = components['MFC2'];
    let sensor1 = components['SHT1'];
    let sensor2 = components['SHT2'];

    // Make the gas cylinder
    const gascyl = new GasCylinderDiagramComponent([50, 120], [80, 300]);

    // Make the MFCs
    MFC1.drawDiagram([250, 10],  [190, 190]);
    MFC2.drawDiagram([250, 225], [190, 190]);

    // Make the humidifier
    //Align the humidifier inlet with the MFC outlet
    const humidifierHeight = 35;
    const humidifier_y = MFC2.diagram.outlet.y - humidifierHeight/2;
    const humidifier_x = MFC2.diagram.outlet.x + 30;
    const humidifier = new HumidifierDiagramComponent([humidifier_x, humidifier_y], [100, humidifierHeight], 'Humidifier');

    // Make Sensor 1 (Output of the system)
    //Align the sensor1 with the MFC1
    const sensor1Size = 50;
    const sensor1_x = 750;
    const sensor1_y = MFC1.diagram.outlet.y - sensor1Size/2;
    sensor1.drawDiagram([sensor1_x, sensor1_y], [sensor1Size, 2*sensor1Size]);

    // Make Sensor 2 (Humidifier Output)
    //Align the sensor2 with the humidifier
    const sensor2Size = 50;
    const sensor2_x = humidifier.outlet.x + 40;
    const sensor2_y = humidifier.outlet.y - sensor2Size/2;
    sensor2.drawDiagram([sensor2_x, sensor2_y], [sensor2Size, 2*sensor2Size])

    // Draw the lines connecting the components to denote flow
    gascyl.routeLineTo(MFC1.diagram, [
        [gascyl.outlet.x, gascyl.outlet.y - 50],
        [(gascyl.outlet.x + MFC1.diagram.inlet.x)/2, gascyl.outlet.y - 50],
        [(gascyl.outlet.x + MFC1.diagram.inlet.x)/2, MFC1.diagram.inlet.y]
    ]);
    gascyl.routeLineTo(MFC2.diagram, [
        [gascyl.outlet.x, gascyl.outlet.y - 50],
        [(gascyl.outlet.x + MFC2.diagram.inlet.x)/2, gascyl.outlet.y - 50],
        [(gascyl.outlet.x + MFC2.diagram.inlet.x)/2, MFC2.diagram.inlet.y]
    ]);
    MFC2.diagram.routeLineTo(humidifier);
    humidifier.routeLineTo(sensor2.diagram);
    MFC1.diagram.routeLineTo(sensor1.diagram);
    sensor2.diagram.routeLineTo(sensor1.diagram, [
        [(sensor2.diagram.outlet.x + sensor1.diagram.inlet.x)/2, sensor2.diagram.outlet.y],
        [(sensor2.diagram.outlet.x + sensor1.diagram.inlet.x)/2, sensor1.diagram.inlet.y]
    ]);

    // Draw an arrow to denote the output of the system
    const arrowLength = 100;
    const arrow = new paper.Path({
        segments: [[sensor1.diagram.outlet.x, sensor1.diagram.outlet.y], [sensor1.diagram.outlet.x + arrowLength, sensor1.diagram.outlet.y]],
        strokeColor: 'black',
        strokeWidth: 5
    });
    //Make the arrowhead
    const arrowhead = new paper.Path.RegularPolygon({
        center: [sensor1.diagram.outlet.x + arrowLength, sensor1.diagram.outlet.y],
        sides: 3,
        radius: 10,
        fillColor: 'black'
    });
    arrowhead.rotate(90, [sensor1.diagram.outlet.x + arrowLength, sensor1.diagram.outlet.y]);
    //Label the output
    const text = new paper.PointText({
        point: [arrow.bounds.right-15, arrow.bounds.top-10],
        content: 'Flow Out',
        fillColor: 'black',
        fontSize: 20
    });
}

////////////////////////////////////////
// Event Handlers
////////////////////////////////////////

//Function to handle the control mode radio buttons
function handleSetpointControlButton() {
    $('#manualControlParams').addClass('d-none');         // Hide the manual control parameters
    $('#arbitrary-settings').addClass('d-none');       // Hide the arbitrary setpoint settings
    $('#setpointControlParams').removeClass('d-none');    // Show the setpoint control parameters
}
function handleManualControlButton() {
    $('#setpointControlParams').addClass('d-none');    // Hide the setpoint control parameters
    $('#arbitrary-settings').addClass('d-none');       // Hide the arbitrary setpoint settings
    $('#manualControlParams').removeClass('d-none');  // Show the manual control parameters
}
function handleArbitraryControlButton() {
    $('#setpointControlParams').addClass('d-none');         // Hide the setpoint control parameters
    $('#manualControlParams').addClass('d-none');         // Hide the manual control parameters
    $('#arbitrary-settings').removeClass('d-none');       // Show the arbitrary setpoint settings
}

function handleControlSubmitButton() {
    console.log('Submit Control Settings');
    
    //Get the control mode
    CONTROL_MODE = $('input[name="controlState"]:checked').val();
    let params = {};

    //Get the control parameters based on the control mode
    switch(CONTROL_MODE) {
        case 'MAN':
            params = {  'MFC1': $('#manualControl-MFC1').val(), 
                        'MFC2': $('#manualControl-MFC2').val()
                    };
            break;
        case 'SPT':
            params = {  'flowRate': $('#setpointControl-flowRate').val(),
                        'humidity': $('#setpointControl-humidity').val()
                    };
            break;
        case 'ARB':
            console.log('Arbitrary Control');
            // Collect all segment settings
            params = {  'segments': getArbSegments(),
                        'flowRate': $('#arbitraryControl-flowRate').val(),
                    };
            break;
    }

    // Send the control values to the server
    console.log('Control Mode:', CONTROL_MODE);
    console.log('Control Params:', params);
    fetch('/set_control', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'controlMode': CONTROL_MODE,
            'params': params
        })
    })
    .then(response => response.json())
    .then(data => {
        // Server handles control setting ranges, reset the control values to the server values
        // Also update the alert to show the current control mode
        updateControlModeDisplay(data);
    });
}


function updateControlModeDisplay(data) {
    CONTROL_MODE = data['control_mode'];
    switch(CONTROL_MODE) {
        case 'MAN':
            $('#manualControl-MFC1').val(data['control_params']['MFC1']);
            $('#manualControl-MFC2').val(data['control_params']['MFC2']);

            $('#controlModeAlert').removeClass('alert-light').addClass('alert-success');
            $('#controlModeAlert-text').html(
                `<b>Manual Control</b>: MFC1 = ${data['control_params']['MFC1']} sccm, MFC2 = ${data['control_params']['MFC2']} sccm`);
            break;
        case 'SPT':
            $('#setpointControl-flowRate').val(data['control_params']['flowRate']);
            $('#setpointControl-humidity').val(data['control_params']['humidity']);
            
            $('#controlModeAlert').removeClass('alert-light').addClass('alert-success');
            $('#controlModeAlert-text').html(
                `<b>Setpoint Control</b>: Flow rate = ${data['control_params']['flowRate']} sccm, Humidity = ${data['control_params']['humidity']} RH%`);
            break;
        case 'ARB':
            console.log('Arbitrary Control');
            console.log(data);
            //Set the text boxes to the server values
            // TODO: Finish populating the segment values
            $('#arbitraryControl-flowRate').val(data['control_params']['flowRate']);

            $('#controlModeAlert').removeClass('alert-light').addClass('alert-success');
            $('#controlModeAlert-text').html(
                `<b>Arbitrary Control</b> mode set. The profile is executed when the data recording is started.`);
        
            console.log('Plotting Segments:', data);
            // Create a Plotly chart
            makeArbSegmentPlot({'time': data['control_params']['time_s'], 'values': data['control_params']['values']});
            break;
    }
}


//Start Recording button handler
function handleStartRecordingButton() {
    console.log('Start Recording');

    //Get the file path to save the data, then send the data to the server
    const saveDirectory = $('#dataRecordingFile').val();
    fetch('/start_recording_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'directory': saveDirectory
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
        IS_RECORDING = true;
        updateRecordingStatusHTML(data['message']);
    });
    
    
}

//Stop Recording button handler
function handleStopRecordingButton() {
    console.log('Stop Recording');
    fetch('/stop_recording_data', {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
    });

    IS_RECORDING = false;
    updateRecordingStatusHTML();
}

//Function to handle the recording status HTML
// Disables the Start Recording button and enables the Stop Recording button when recording
// or vice versa
// Also changes the alert text and class to indicate the recording status
function updateRecordingStatusHTML(message) {
    if (IS_RECORDING) {
        $('#recordingStatusAlert').removeClass('alert-secondary').addClass('alert-success');       // Change the alert class to success
        console.log(message);
        $('#recordingStatusAlert-text').text(message);      // Change the alert text
        $('#startRecordingButton').prop('disabled', true);  // Disable the start recording button
        $('#stopRecordingButton').prop('disabled', false);  // Enable the stop recording button
    } else {
        $('#recordingStatusAlert').removeClass('alert-success').addClass('alert-secondary');    // Change the alert class to light
        $('#recordingStatusAlert-text').text('Data Not Recording');                                  // Change the alert text
        $('#startRecordingButton').prop('disabled', false);                                                      // Enable the start recording button
        $('#stopRecordingButton').prop('disabled', true);                                                     // Disable the stop recording button
    }
}


/////////
// Plot Arbitrary Segments
//////////

function handleAddSegmentRow(values = {'value': "", 'segment_string': ''}) {

    console.log(values);
    var newRow = `
        <div class="row segment-row">
            <div class="col-md-1" style="text-align: right;"></div>
            <div class="col-md-3">
                <div class="form-group">
                    <input type="number" step="0.01" class="form-control" name="duration" value=${values['value']}>
                </div>
            </div>
            <div class="col-md-6">
                <div class="form-group">
                    <input type="text" class="form-control" name="segment_string" value=${values['segment_string']}>
                </div>
            </div>
            <div class="col-md-2">
                <button type="button" class="btn btn-danger btn-sm remove-segment-row">X</button>
            </div>
        </div>
    `;
    $('#segment-settings-container').append(newRow);
}

function handlePlotSegmentsButton() {
    // Collect all segment settings
    let segmentSettings = getArbSegments();
    
    console.log('Sending Segments', segmentSettings);
    // Send the segment settings to the server
    fetch('/plot_flow_arbitrary', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(segmentSettings)
    }).then(response => response.json())    // Parse the JSON response
    .then(data => {                         // Use the data to plot the segments
        console.log('Plotting Segments:', data);
        // Create a Plotly chart
        makeArbSegmentPlot(data);
    }).catch(error => {
        console.error('Error:', error);
    });
}

/**
 * This function is responsible for collecting all segment settings from the form.
 *
 * @returns {Array} - An array of segment settings.
 */
function getArbSegments() {
    var segmentSettings = [];
    $('.segment-row').each(function() {
        var duration = $(this).find('input[name="duration"]').val();
        var segmentString = $(this).find('input[name="segment_string"]').val();
        segmentSettings.push({ duration: duration, 
                            segmentString: segmentString });
    });
    return segmentSettings;
}

/**
 * This function is responsible for creating a plot based on the provided data.
 *
 * @param {Object} data - The data used to generate the plot.
 */
function makeArbSegmentPlot(data) {
    var chartData = [
        {
            x: data.time,
            y: data.values,
            type: 'scatter',
            mode: 'lines+markers',
        }
    ];

    var layout = {
        xaxis: {
            title: 'Duration [min]'
        },
        margin: {
            l: 50,  // left margin in pixels
            r: 50,  // right margin in pixels
            t: 10,  // top margin in pixels
            b: 50,  // bottom margin in pixels
            pad: 5  // padding around the plot area in pixels
        },
        height: 400
    };
    Plotly.newPlot('arbitrarySetpointModal-chart', chartData, layout);
}
