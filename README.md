# node-red-contrib-gps4net
Custom Node-RED nodes for GPS4NET

## g4n03rht-decode

**g4n03rht-decode** is a node that decodes CAN frames from G4N03RHT temperature and humidity sensors to higher level data.

### Inputs

*   CAN frame
    
    payload object
    
    The input is in the form of a JSON object in **socketcan** format, with the following content:
    
    {
    	timestamp: 1680699437931,
    	ext: true,
    	canid: 0x18ff8100,
    	dlc: 8,
    	rtr: false,
    	data: \[2,1,0,7,116,96,51,88\]
    }
    					
    
    *   **canid** - The standard or extended CAN id.
    *   **ext** - Set to true if this is a extended id frame. False otherwise.
    *   **rtr** - Specifies a remote transmission request frame if set to true.
    *   **dlc** - Number of databytes.
    *   **data** - An array with data or null or an empty array if no data.
    *   **timestamp** - Relative timestamp in microseconds
    

### Outputs

#### Rules

Each rule is a composite filter that sets up an additional output and has two settings:

1.  **PSN** - The sensor's PSN or `FFFFFFFF` for any of the sensors
2.  **Metric** - The metric that one wants on the output: temperature, humidity, I/O voltage values for the different scenarios: instantaneous samples, average values, alarm values when a temperature, humidity or I/O alarm is triggered. By default the metric is set up to output full message objects.

*   Full message
    
    payload object | number
    
    by default the node translates and outputs every message that is given on the output in a JSON object with the following keys:
    
    *   **psn** - The sensor's PSN (product serial number), 4 byte hex string.
    *   **type** - The message type, string.
    *   **epoch** - The UNIX epoch of the message, integer.
    
      
    Additional keys will also be present depending on message type, described in the **Unsolicited messages** and **Command messages** sections. If any other metric than _Full message_ is selected, the payload will contain an integer or a floating pint number representing the selected metric's value. The _dew point_ metric os computed based on the temperature and humidity.
    
    topic string
    
    the message topic is uses the following format:
    
    *   `PSN` if the output is configured to supply the full message.
    *   `PSN/metric` if the output is configured to supply a temperature, humidity or I/O voltage value.
    

#### Unsolicited messages

These messages are sent by sensors operating in reporting mode at configured intervals or when certain events take place, for instance when an alarm triggers or when the sensor network is placed in a different operating mode. Additional fields specific to each of the unsolicited message types are detailed below.

##### insth

Instantaneous temperature and humidity message

*   **ins\_temp** - The instantaneous temperature in °C.
*   **ins\_rh** - The instantaneous relative humidity in %.

##### avrth

Average temperature and humidity message

*   **avg\_temp** - The average temperature in °C.
*   **avg\_rh** - The average relative humidity in %.

##### insio

Instantaneous analog input voltage message

*   **ins\_io1** - The instantaneous voltage on the sensor's IO1 port in V.
*   **ins\_io2** - The instantaneous voltage on the sensor's IO2 port in V.

##### almt

Temperature alarm message

*   **action** - Event type, integer.
    *   16 - temperature over maximum threshold
    *   17 - temperature under maximum threshold
    *   18 - temperature under minimum threshold
    *   19 - temperature over minimum threshold

*   **alm\_temp** - The temperature in °C upon triggering an alarm, float.
*   **max\_temp\_th** - Maximum temperature threshold in °C, float.
*   **min\_temp\_th** - Minimum temperature threshold in °C, float.

##### almh

Relative humidity alarm message

*   **action** - Event type, integer.
    *   32 - humidity over maximum threshold
    *   33 - humidity under maximum threshold
    *   34 - humidity under minimum threshold
    *   35 - humidity over minimum threshold

*   **alm\_rh** - The relative humidity in % upon triggering an alarm, float.
*   **max\_rh\_th** - Maximum relative humidity threshold in %, float.
*   **min\_rh\_th** - Minimum relative humidity threshold in %, float.

##### almio

Analog input voltage alarm message

*   **action** - Event type, integer.
    *   48 - IO1 voltage over maximum threshold
    *   49 - IO1 voltage under maximum threshold
    *   50 - IO1 voltage under minimum threshold
    *   51 - IO1 voltage over minimum threshold
    *   52 - IO2 voltage over maximum threshold
    *   53 - IO2 voltage under maximum threshold
    *   54 - IO2 voltage under minimum threshold
    *   55 - IO2 voltage over minimum threshold

*   **alm\_io1** - The IO1 voltage in V upon triggering an alarm, integer.
*   **alm\_io2** - The IO2 voltage in V upon triggering an alarm, integer.
*   **max\_io1\_th** - Maximum IO1 voltage threshold in V, integer.
*   **min\_io1\_th** - Minimum IO1 voltage threshold in V, integer.
*   **max\_io2\_th** - Maximum IO2 voltage threshold in V, integer.
*   **min\_io2\_th** - Minimum IO2 voltage threshold in V, integer.

##### sysevn

System events message

*   **action** - Event type, integer.
    *   64 - reset or power on event detected
    *   65 - programming mode enabled
    *   66 - programming mode disabled
    *   67 - maintenance mode enabled
    *   68 - maintenance mode disabled

*   **sys\_cnf** - System configuration, integer. Options listed below:
    *   snsr\_ena - sensor enabled
    *   io1\_mntc - assign IO1 as input for enabling maintenance mode using an external switch
    *   io2\_mntc - assign IO2 as input for enabling maintenance mode using an external switch
    *   avg\_val\_evt - use average temperature and humidity values for alarm event detection
    *   temp\_c\_bcd - sensor temperature format is °C; in BCD
    *   temp\_k\_bin - sensor temperature format is K x100 in binary

*   **alm\_cnf** - Alarm configuration, integer. Options listed below:
    *   led\_temp\_alm - enable LED blink when the temperature alarm is triggered
    *   led\_rh\_alm - enable LED blink when the humidity alarm is triggered
    *   led\_io\_alm - enable LED blink when the IO alarms is triggered
    *   io\_temp\_alm - temperature events trigger the alarm's assigned IO
    *   io\_rh\_alm - humidity events trigger the alarm's assigned IO
    *   io\_io\_alm - IO events trigger the alarm's assigned IO

*   **io\_fltr** - Time interval in seconds for the IO voltage hold timer, float.

##### sysstat

System status message

*   **sys\_stat** - System status, integer. Options listed below:
    *   ovr\_max\_temp\_th - over maximum temperature threshold
    *   und\_min\_temp\_th - under minumum temperature threshold
    *   ovr\_max\_rh\_th - over maximum humidity threshold
    *   und\_min\_rh\_th - under minumum humidity threshold
    *   ovr\_max\_io1\_th - over maximum IO1 voltage threshold
    *   und\_min\_io1\_th - under minumum IO1 voltage threshold
    *   ovr\_max\_io2\_th - over maximum IO2 voltage threshold
    *   und\_min\_io2\_th - under minumum IO2 voltage threshold
    *   snsr\_act - sensor is active
    *   alm\_ind\_led - the alarm condition is indicated by the LED, as indicated by the **alm\_cnf** parameter
    *   heat\_act - the sensor's built-in heater is active
    *   alm\_ind\_io - the alarm condition is indicated by an assigned IO, as indicated by the **alm\_cnf** parameter
    *   snsr\_mtnc - sensor operating in maintenance mode
    *   snsr\_prog - sensor operating in programming mode

#### Command messages

These messages are sent to place the sensor network in programming mode or in reporting mode. When the network is operating in programming mode, command messages are sent to query or program the different parameters for each sensor. While operating in programming mode, each sensor also broadcasts unsolicited **prog** messages with a particular action field. Additional fields specific to each of the command message types are detailed below.

##### prog

Programming messages. The sensors network needs to be operating in programming mode in order to respond to command messages.

*   **action** - Action type, integer.
    *   0 - wku: enable programming mode
    *   1 - slp: disable programming mode
    *   240 - keepalive: sent every 250 ms by the first sensor that received the wku command
    *   241 - imalive: sent every 250 ms by each sensor that is operating in programming mode

##### sysset

System configuration messages. See the **sysevn** message above for details about the **sys\_cnf** and **alm\_cnf** options. To change any of those options using action type 2, one needs to supply the message type and the **sys\_cnf**, **alm\_cnf** and **io\_fltr** in addition to the modified option.

*   **action** - Action type, integer.
    *   0 - query parameters
    *   1 - query response
    *   2 - program parameters
    *   3 - programming confirmation

*   **sys\_cnf** - System configuration, integer.
*   **alm\_cnf** - Alarm configuration, integer.
*   **io\_fltr** - Time interval in seconds for the IO voltage hold timer, float.

##### tmpcal

Temperature calibration offset messages. Programming this parameter will add the value of the calibration offset to the reported temperature. Be aware that the relative humidity and dew point calculations are also negatively impacted by programming a non zero value.

*   **action** - Action type, integer.
    *   0 - query parameter
    *   1 - query response
    *   2 - program parameter
    *   3 - programming confirmation

*   **temp\_cal\_ofst** - Temperature calibration offset in °C, float -327.68..+327.67

##### instset

Broadcast and sampling interval for the instantaneous temperature and humidity message **insth**.

*   **action** - Action type, integer.
    *   0 - query parameter
    *   1 - query response
    *   2 - program parameter
    *   3 - programming confirmation

*   **ins\_int** - sampling interval in seconds, integer 0..16383.75

##### avrset

Broadcast and averaging interval for the average temperature and humidity message **avrth**.

*   **action** - Action type, integer.
    *   0 - query parameter
    *   1 - query response
    *   2 - program parameter
    *   3 - programming confirmation

*   **avg\_int** - averaging interval in seconds, integer 0..655350

##### almtsetmax

Maximum temperature threshold for triggering the **almt** alarm event messages.

*   **action** - Action type, integer.
    *   0 - query parameter
    *   1 - query response
    *   2 - program parameter
    *   3 - programming confirmation

*   **max\_temp\_th** - maximum temperature threshold in °C/K, float -273.15..382.2

##### almtsetmin

Minimum temperature threshold for triggering the **almt** alarm event messages.

*   **action** - Action type, integer.
    *   0 - query parameter
    *   1 - query response
    *   2 - program parameter
    *   3 - programming confirmation

*   **min\_temp\_th** - minimum temperature threshold in °C/K, float -273.15..382.2

##### almhsetmax

Maximum relative humidity threshold for triggering the **almh** alarm event messages.

*   **action** - Action type, integer.
    *   0 - query parameter
    *   1 - query response
    *   2 - program parameter
    *   3 - programming confirmation

*   **max\_rh** - maximum humidity threshold in %, float 0..100

##### almhsetmin

Minimum relative humidity threshold for triggering the **almh** alarm event messages.

*   **action** - Action type, integer.
    *   0 - query parameter
    *   1 - query response
    *   2 - program parameter
    *   3 - programming confirmation

*   **min\_rh** - minimum humidity threshold in %, float 0..100

##### almio1set

Maximum and minimum voltage thresholds for triggering the **alm\_io1** alarm event messages.

*   **action** - Action type, integer.
    *   0 - query parameter
    *   1 - query response
    *   2 - program parameter
    *   3 - programming confirmation

*   **max\_io1\_th** - maximum voltage threshold on IO1 in V, integer 0..99
*   **min\_io1\_th** - maximum voltage threshold on IO1 in V, integer 0..99

##### almio2set

Maximum and minimum voltage thresholds for triggering the **alm\_io2** alarm event messages.

*   **action** - Action type, integer.
    *   0 - query parameter
    *   1 - query response
    *   2 - program parameter
    *   3 - programming confirmation

*   **max\_io2\_th** - maximum voltage threshold on IO2 in V, integer 0..99
*   **min\_io2\_th** - maximum voltage threshold on IO2 in V, integer 0..99

##### sensorcure

Sensor curing messages. Activates the sensor's heating element.

*   **action** - Action type, integer.
    *   2 - program parameter
    *   3 - programming confirmation

*   **heat\_intst** - heater intensity, integer 0..15

##### maintset

Maintenance mode triggering voltage threshold.

*   **action** - Action type, integer.
    *   0 - query parameter
    *   1 - query response
    *   2 - program parameter
    *   3 - programming confirmation

*   **max\_mntc** - maximum voltage for triggering maintenance mode in V, integer 0..99
*   **min\_mntc** - minimum voltage for triggering maintenance mode in V, integer 0..99

## g4n03rht-encode

**g4n03rht-encode** is a node that encodes CAN frames for G4N03RHT temperature and humidity sensors.

### Inputs

*   Message
    
    payload object
    
    by default the node translates and outputs every message that is given on the output in a JSON object with the following keys:
    
    *   **psn** - The sensor's PSN (product serial number), 4 byte hex string.
    *   **type** - The message type, string.
    
      
    Additional keys for programming parameters should also be present depending on message type. These are described in the **Command messages** section.
    

#### Command messages

These messages are sent to place the sensor network in programming mode or in reporting mode. When the network is operating in programming mode, command messages are sent to query or program the different parameters for each sensor. While operating in programming mode, each sensor also broadcasts unsolicited **prog** messages with a particular action field. Additional fields specific to each of the command message types are detailed below.

##### prog

Programming messages. The sensors network needs to be operating in programming mode in order to respond to command messages.

*   **action** - Action type, integer.
    *   0 - wku: enable programming mode
    *   1 - slp: disable programming mode

##### sysset

System configuration messages. To change any of those options using action type 2, one needs to supply the message type and the **sys\_cnf**, **alm\_cnf** and **io\_fltr** in addition to the modified option.

*   **action** - Action type, integer.
    *   0 - query parameters
    *   2 - program parameters

*   **sys\_cnf** - System configuration, integer. Options listed below:
    *   snsr\_ena - sensor enabled
    *   io1\_mntc - assign IO1 as input for enabling maintenance mode using an external switch
    *   io2\_mntc - assign IO2 as input for enabling maintenance mode using an external switch
    *   avg\_val\_evt - use average temperature and humidity values for alarm event detection
    *   temp\_c\_bcd - sensor temperature format is °C; in BCD
    *   temp\_k\_bin - sensor temperature format is K x100 in binary

*   **alm\_cnf** - Alarm configuration, integer. Options listed below:
    *   led\_temp\_alm - enable LED blink when the temperature alarm is triggered
    *   led\_rh\_alm - enable LED blink when the humidity alarm is triggered
    *   led\_io\_alm - enable LED blink when the IO alarms is triggered
    *   io\_temp\_alm - temperature events trigger the alarm's assigned IO
    *   io\_rh\_alm - humidity events trigger the alarm's assigned IO
    *   io\_io\_alm - IO events trigger the alarm's assigned IO

*   **io\_fltr** - Time interval in seconds for the IO voltage hold timer, float.

##### tmpcal

Temperature calibration offset messages. Programming this parameter will add the value of the calibration offset to the reported temperature. Be aware that the relative humidity and dew point calculations are also negatively impacted by programming a non zero value.

*   **action** - Action type, integer.
    *   0 - query parameter
    *   2 - program parameter

*   **temp\_cal\_ofst** - Temperature calibration offset in °C, float -327.68..+327.67

##### instset

Broadcast and sampling interval for the instantaneous temperature and humidity message **insth**.

*   **action** - Action type, integer.
    *   0 - query parameter
    *   2 - program parameter

*   **ins\_int** - sampling interval in seconds, integer 0..16383.75

##### avrset

Broadcast and averaging interval for the average temperature and humidity message **avrth**.

*   **action** - Action type, integer.
    *   0 - query parameter
    *   2 - program parameter

*   **avg\_int** - averaging interval in seconds, integer 0..655350

##### almtsetmax

Maximum temperature threshold for triggering the **almt** alarm event messages.

*   **action** - Action type, integer.
    *   0 - query parameter
    *   2 - program parameter

*   **max\_temp\_th** - maximum temperature threshold in °C/K, float -273.15..382.2

##### almtsetmin

Minimum temperature threshold for triggering the **almt** alarm event messages.

*   **action** - Action type, integer.
    *   0 - query parameter
    *   2 - program parameter

*   **min\_temp\_th** - minimum temperature threshold in °C/K, float -273.15..382.2

##### almhsetmax

Maximum relative humidity threshold for triggering the **almh** alarm event messages.

*   **action** - Action type, integer.
    *   0 - query parameter
    *   2 - program parameter

*   **max\_rh** - maximum humidity threshold in %, float 0..100

##### almhsetmin

Minimum relative humidity threshold for triggering the **almh** alarm event messages.

*   **action** - Action type, integer.
    *   0 - query parameter
    *   2 - program parameter

*   **min\_rh** - minimum humidity threshold in %, float 0..100

##### almio1set

Maximum and minimum voltage thresholds for triggering the **alm\_io1** alarm event messages.

*   **action** - Action type, integer.
    *   0 - query parameter
    *   2 - program parameter

*   **max\_io1\_th** - maximum voltage threshold on IO1 in V, integer 0..99
*   **min\_io1\_th** - maximum voltage threshold on IO1 in V, integer 0..99

##### almio2set

Maximum and minimum voltage thresholds for triggering the **alm\_io2** alarm event messages.

*   **action** - Action type, integer.
    *   0 - query parameter
    *   2 - program parameter

*   **max\_io2\_th** - maximum voltage threshold on IO2 in V, integer 0..99
*   **min\_io2\_th** - maximum voltage threshold on IO2 in V, integer 0..99

##### sensorcure

Sensor curing messages. Activates the sensor's heating element.

*   **action** - Action type, integer.
    *   2 - program parameter

*   **heat\_intst** - heater intensity, integer 0..15

##### maintset

Maintenance mode triggering voltage threshold.

*   **action** - Action type, integer.
    *   0 - query parameter
    *   2 - program parameter

*   **max\_mntc** - maximum voltage for triggering maintenance mode in V, integer 0..99
*   **min\_mntc** - minimum voltage for triggering maintenance mode in V, integer 0..99

### Outputs

*   CAN frame
    
    payload object
    
    The output of this module in the form of a JSON object in **socketcan** format, with the following content:
    
    {
    	timestamp: 1680699437931,
    	ext: true,
    	canid: 0x18ff8100,
    	dlc: 8,
    	rtr: false,
    	data: \[2,1,0,7,116,96,51,88\]
    }
    					
    
    *   **canid** - The standard or extended CAN id.
    *   **ext** - Set to true if this is a extended id frame. False otherwise.
    *   **rtr** - Specifies a remote transmission request frame if set to true.
    *   **dlc** - Number of databytes.
    *   **data** - An array with data or null or an empty array if no data.
    *   **timestamp** - Relative timestamp in microseconds
