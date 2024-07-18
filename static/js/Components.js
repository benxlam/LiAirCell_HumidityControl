class DAQ {
    constructor(label, accessPoint) {
        this.label = label;
        this.port = [];
        this.accessPoint = accessPoint;     // access point on the Flask server

        this.isConnected = false; // Connection status tracker
    }

    async fetchData() {
        try {
            // Fetch data from the server
            const response = await fetch(this.accessPoint + '/fetch_data');
            const data = await response.json();

            // Check if data is empty, return an empty array if so
            if (data.length === 0) {
                return [];
            }

            // Process the data
            let processedData = data.reduce((acc, d) => {
                // For each key in the 'values' object of the current data point 'd'
                Object.keys(d.values).forEach(key => {
                    // If the accumulator object does not already have this key, initialize it
                    if (!acc[key]) {
                        acc[key] = {
                            datetime: [],  // Array to store datetime values for this key
                            timestamp: [], // Array to store timestamp values for this key
                            values: []     // Array to store the actual data values for this key
                        };
                    }
                    // Convert the 'datetime' string to a Date object and push it to the 'datetime' array
                    acc[key].datetime.push(new Date(d.datetime));
                    // Push the 'timestamp' value to the 'timestamp' array
                    acc[key].timestamp.push(d.timestamp);
                    // Push the actual data value for this key to the 'values' array
                    acc[key].values.push(d.values[key]);
                });
                // Return the updated accumulator object after processing the current data point 'd'
                return acc;
            }, {});

            return processedData;
        } catch (error) {
            console.error(`${this.plotTitle} Could not FETCH:`, error);
            throw error; // Re-throw the error to be caught by the caller
        }
    }


    connect(port) { 
        this.port = port;

        // Prepare data object to send in POST request
        const requestData = {
            port: this.port
        };

        // Perform server request using fetch with POST method
        fetch(`${this.accessPoint}/connect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
        .then(response => response.json())
        .then(data => {
            // Handle server response here
            console.log('Server Response:', data);
            this.isConnected = data.success;
            this.updateHTMLStatus();
        })
        .catch(error => {
            // Handle error scenario
            console.error('Error connecting:', error);
        });
    }

    /**
     * Checks the connection to the server.
     * @returns {boolean} Returns true if the connection is successful, false otherwise.
     */
    async checkConnection() {
        // Perform server request using fetch with GET method
        await fetch(`${this.accessPoint}/connect`)
        .then(response => response.json())
        .then(data => {
            // Handle server response here
            // console.log(`[Check Connection] ${this.label}`, data);
            this.isConnected = data.success;
            this.port = data.port;
        })
        .catch(error => {
            // Handle error scenario
            console.error('Error checking connection:', error);
        });

        this.updateHTMLStatus();
        return this.isConnected;
    }

    // Implement this method in the child classes
    updateHTMLStatus() {}
}
class MFC extends DAQ {
    constructor(label, accessPoint) {
        super(label, accessPoint);
    }

    drawDiagram(position, bounds) {
        this.diagram = new MFCDiagramComponent(position, bounds, this.label);
        // Show a modal to update the MFC port when the MFC Diagram Component is clicked
        this.diagram.group.onClick = () => this.showEditModal();
        this.diagram.group.onMouseEnter = (event) => document.body.style.cursor = 'pointer';
        this.diagram.group.onMouseLeave = (event) => document.body.style.cursor = 'default';
    }


    // Method to update the attributes of the shape by bringing up a modal
    showEditModal() {
        // Update the status of the MFC badge indicator
        this.updateHTMLStatus();

        // Show modal and populate with current values
        $('#mfcPort').val(this.port);
        $('#mfcModalLabel').text(this.label);
        $('#mfcModal').modal('show');

        // Attach event listener to connect button click
        $('#mfcForm-connectButton').off('click').on('click', () => {
            this.port = $('#mfcPort').val(); // Get the port value from input from the form
            this.connect(this.port);
        });
    }

    updateHTMLStatus() {
        const statusIndicatorBadge = $('#mfcStatus');

        if (this.isConnected) {
            // Update HTML content and style for success
            statusIndicatorBadge.text('Status: Connected');
            statusIndicatorBadge.removeClass('bg-danger').addClass('bg-success');

            // Update the color of the diagram
            this.diagram.updateColor('green');

            //Update the text of the diagram
            
        } else {
            // Update HTML content and style for failure
            statusIndicatorBadge.text('Status: Disconnected');
            statusIndicatorBadge.removeClass('bg-success').addClass('bg-danger');
            
            // Update the color of the diagram
            this.diagram.updateColor('red');
        }
    }
}

class Sensor extends DAQ {
    constructor(label, accessPoint) {
        super(label, accessPoint);
    }

    drawDiagram(position, bounds) {
        this.diagram = new SensorDiagramComponent(position, bounds, this.label);

        // Show a modal to update the Sensor settings when the sensor diagram component is clicked
        this.diagram.group.onClick = () => this.showEditModal();
        this.diagram.group.onMouseEnter = (event) => document.body.style.cursor = 'pointer';
        this.diagram.group.onMouseLeave = (event) => document.body.style.cursor = 'default';
    }

    // Method to update the attributes of the shape by bringing up a modal
    showEditModal() {
        // Update the status of the Sensor badge indicator
        this.updateHTMLStatus();

        // Show modal and populate with current value of the port (I2C address), if they exist
        if (this.port) 
            $('#sensorAddress').val('0x' + this.port.toString(16).padStart(2, '0').toUpperCase());
        $('#sensorModalLabel').text(`${this.label}`);
        $('#sensorModal').modal('show');

        // Attach event listener to connect button click
        $('#sensorForm-connectButton').off('click').on('click', () => {
            this.port = parseInt($('#sensorAddress').val(), 16); // Get the sensor address value from input from the form
            this.connect(this.port);
        });
    }
    
    async checkConnection() {
        // Perform server request using fetch with GET method
        await fetch(`${this.accessPoint}/connect`)
        .then(response => response.json())
        .then(data => {
            // Handle server response here
            this.isConnected = data.success;
            this.port = data.port;
        })
        .catch(error => {
            // Handle error scenario
            console.error('Error checking connection:', error);
        });
        
        this.updateHTMLStatus();
        return this.isConnected;
    }

    updateHTMLStatus() {
        const statusIndicatorBadge = $('#sensorStatus');

        if (this.isConnected) {
            // Update HTML content and style for success
            statusIndicatorBadge.text('Status: Connected');
            statusIndicatorBadge.removeClass('bg-danger').addClass('bg-success');

            // Update the color of the diagram
            this.diagram.updateColor('green');
        } else {
            // Update HTML content and style for failure
            statusIndicatorBadge.text('Status: Disconnected');
            statusIndicatorBadge.removeClass('bg-success').addClass('bg-danger');
            
            // Update the color of the diagram
            this.diagram.updateColor('red');
        }
    }
}