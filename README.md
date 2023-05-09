# node-red-contrib-gps4net

Custom Node-RED nodes for GPS4NET

## g4n03rht-decode

**g4n03rht-decode** is a node that decodes CAN frames from G4N03RHT temperature and humidity sensors to higher level data.

### Inputs

-   CAN frame

    payload object

    The input is in the form of a JSON object in **socketcan** format, with the following content:

    ```
    {
        timestamp: 1680699437931,
        ext: true,
        canid: 0x18ff8100,
        dlc: 8,
        rtr: false,
        data: [2,1,0,7,116,96,51,88]
    }
    ```

    -   **canid** - The standard or extended CAN id.
    -   **ext** - Set to true if this is a extended id frame. False otherwise.
    -   **rtr** - Specifies a remote transmission request frame if set to true.
    -   **dlc** - Number of databytes.
    -   **data** - An array with data or null or an empty array if no data.
    -   **timestamp** - Relative timestamp in microseconds

### Outputs

#### Rules

Each rule is a composite filter that sets up an additional output and has two settings:

1.  **PSN** - The sensor's PSN or `FFFFFFFF` for any of the sensors
2.  **Metric** - The metric that one wants on the output: temperature, humidity, I/O voltage values for the different scenarios: instantaneous samples, average values, alarm values when a temperature, humidity or I/O alarm is triggered. By default the metric is set up to output full message objects.

-   Full message

    payload object | number

    by default the node translates and outputs every message that is given on the output in a JSON object with the following keys:

    -   **psn** - The sensor's PSN (product serial number), 4 byte hex string.
    -   **type** - The message type, string.
    -   **epoch** - The UNIX epoch of the message, integer.

    Additional keys will also be present depending on message type, described in the **Unsolicited messages** and **Command messages** sections. If any other metric than _Full message_ is selected, the payload will contain an integer or a floating pint number representing the selected metric's value. The _dew point_ metric os computed based on the temperature and humidity.

    topic string

    the message topic is uses the following format:

    -   `PSN` if the output is configured to supply the full message.
    -   `PSN/metric` if the output is configured to supply a temperature, humidity or I/O voltage value.

#### Unsolicited messages

These messages are sent by sensors operating in reporting mode at configured intervals or when certain events take place, for instance when an alarm triggers or when the sensor network is placed in a different operating mode. Additional fields specific to each of the unsolicited message types are detailed below.

##### insth

Instantaneous temperature and humidity message

-   **ins_temp** - The instantaneous temperature in °C.
-   **ins_rh** - The instantaneous relative humidity in %.

##### avrth

Average temperature and humidity message

-   **avg_temp** - The average temperature in °C.
-   **avg_rh** - The average relative humidity in %.

##### insio

Instantaneous analog input voltage message

-   **ins_io1** - The instantaneous voltage on the sensor's IO1 port in V.
-   **ins_io2** - The instantaneous voltage on the sensor's IO2 port in V.

##### almt

Temperature alarm message

-   **action** - Event type, integer.

    -   16 - temperature over maximum threshold
    -   17 - temperature under maximum threshold
    -   18 - temperature under minimum threshold
    -   19 - temperature over minimum threshold

-   **alm_temp** - The temperature in °C upon triggering an alarm, float.
-   **max_temp_th** - Maximum temperature threshold in °C, float.
-   **min_temp_th** - Minimum temperature threshold in °C, float.

##### almh

Relative humidity alarm message

-   **action** - Event type, integer.

    -   32 - humidity over maximum threshold
    -   33 - humidity under maximum threshold
    -   34 - humidity under minimum threshold
    -   35 - humidity over minimum threshold

-   **alm_rh** - The relative humidity in % upon triggering an alarm, float.
-   **max_rh_th** - Maximum relative humidity threshold in %, float.
-   **min_rh_th** - Minimum relative humidity threshold in %, float.

##### almio

Analog input voltage alarm message

-   **action** - Event type, integer.

    -   48 - IO1 voltage over maximum threshold
    -   49 - IO1 voltage under maximum threshold
    -   50 - IO1 voltage under minimum threshold
    -   51 - IO1 voltage over minimum threshold
    -   52 - IO2 voltage over maximum threshold
    -   53 - IO2 voltage under maximum threshold
    -   54 - IO2 voltage under minimum threshold
    -   55 - IO2 voltage over minimum threshold

-   **alm_io1** - The IO1 voltage in V upon triggering an alarm, integer.
-   **alm_io2** - The IO2 voltage in V upon triggering an alarm, integer.
-   **max_io1_th** - Maximum IO1 voltage threshold in V, integer.
-   **min_io1_th** - Minimum IO1 voltage threshold in V, integer.
-   **max_io2_th** - Maximum IO2 voltage threshold in V, integer.
-   **min_io2_th** - Minimum IO2 voltage threshold in V, integer.

##### sysevn

System events message

-   **action** - Event type, integer.

    -   64 - reset or power on event detected
    -   65 - programming mode enabled
    -   66 - programming mode disabled
    -   67 - maintenance mode enabled
    -   68 - maintenance mode disabled

-   **sys_cnf** - System configuration, integer. Options listed below:

    -   snsr_ena - sensor enabled
    -   io1_mntc - assign IO1 as input for enabling maintenance mode using an external switch
    -   io2_mntc - assign IO2 as input for enabling maintenance mode using an external switch
    -   avg_val_evt - use average temperature and humidity values for alarm event detection
    -   temp_c_bcd - sensor temperature format is °C; in BCD
    -   temp_k_bin - sensor temperature format is K x100 in binary

-   **alm_cnf** - Alarm configuration, integer. Options listed below:

    -   led_temp_alm - enable LED blink when the temperature alarm is triggered
    -   led_rh_alm - enable LED blink when the humidity alarm is triggered
    -   led_io_alm - enable LED blink when the IO alarms is triggered
    -   io_temp_alm - temperature events trigger the alarm's assigned IO
    -   io_rh_alm - humidity events trigger the alarm's assigned IO
    -   io_io_alm - IO events trigger the alarm's assigned IO

-   **io_fltr** - Time interval in seconds for the IO voltage hold timer, float.

##### sysstat

System status message

-   **sys_stat** - System status, integer. Options listed below:
    -   ovr_max_temp_th - over maximum temperature threshold
    -   und_min_temp_th - under minumum temperature threshold
    -   ovr_max_rh_th - over maximum humidity threshold
    -   und_min_rh_th - under minumum humidity threshold
    -   ovr_max_io1_th - over maximum IO1 voltage threshold
    -   und_min_io1_th - under minumum IO1 voltage threshold
    -   ovr_max_io2_th - over maximum IO2 voltage threshold
    -   und_min_io2_th - under minumum IO2 voltage threshold
    -   snsr_act - sensor is active
    -   alm_ind_led - the alarm condition is indicated by the LED, as indicated by the **alm_cnf** parameter
    -   heat_act - the sensor's built-in heater is active
    -   alm_ind_io - the alarm condition is indicated by an assigned IO, as indicated by the **alm_cnf** parameter
    -   snsr_mtnc - sensor operating in maintenance mode
    -   snsr_prog - sensor operating in programming mode

#### Command messages

These messages are sent to place the sensor network in programming mode or in reporting mode. When the network is operating in programming mode, command messages are sent to query or program the different parameters for each sensor. While operating in programming mode, each sensor also broadcasts unsolicited **prog** messages with a particular action field. Additional fields specific to each of the command message types are detailed below.

##### prog

Programming messages. The sensors network needs to be operating in programming mode in order to respond to command messages.

-   **action** - Action type, integer.
    -   0 - wku: enable programming mode
    -   1 - slp: disable programming mode
    -   240 - keepalive: sent every 250 ms by the first sensor that received the wku command
    -   241 - imalive: sent every 250 ms by each sensor that is operating in programming mode

##### sysset

System configuration messages. See the **sysevn** message above for details about the **sys_cnf** and **alm_cnf** options. To change any of those options using action type 2, one needs to supply the message type and the **sys_cnf**, **alm_cnf** and **io_fltr** in addition to the modified option.

-   **action** - Action type, integer.

    -   0 - query parameters
    -   1 - query response
    -   2 - program parameters
    -   3 - programming confirmation

-   **sys_cnf** - System configuration, integer.
-   **alm_cnf** - Alarm configuration, integer.
-   **io_fltr** - Time interval in seconds for the IO voltage hold timer, float.

##### tmpcal

Temperature calibration offset messages. Programming this parameter will add the value of the calibration offset to the reported temperature. Be aware that the relative humidity and dew point calculations are also negatively impacted by programming a non zero value.

-   **action** - Action type, integer.

    -   0 - query parameter
    -   1 - query response
    -   2 - program parameter
    -   3 - programming confirmation

-   **temp_cal_ofst** - Temperature calibration offset in °C, float -327.68..+327.67

##### instset

Broadcast and sampling interval for the instantaneous temperature and humidity message **insth**.

-   **action** - Action type, integer.

    -   0 - query parameter
    -   1 - query response
    -   2 - program parameter
    -   3 - programming confirmation

-   **ins_int** - sampling interval in seconds, integer 0..16383.75

##### avrset

Broadcast and averaging interval for the average temperature and humidity message **avrth**.

-   **action** - Action type, integer.

    -   0 - query parameter
    -   1 - query response
    -   2 - program parameter
    -   3 - programming confirmation

-   **avg_int** - averaging interval in seconds, integer 0..655350

##### almtsetmax

Maximum temperature threshold for triggering the **almt** alarm event messages.

-   **action** - Action type, integer.

    -   0 - query parameter
    -   1 - query response
    -   2 - program parameter
    -   3 - programming confirmation

-   **max_temp_th** - maximum temperature threshold in °C/K, float -273.15..382.2

##### almtsetmin

Minimum temperature threshold for triggering the **almt** alarm event messages.

-   **action** - Action type, integer.

    -   0 - query parameter
    -   1 - query response
    -   2 - program parameter
    -   3 - programming confirmation

-   **min_temp_th** - minimum temperature threshold in °C/K, float -273.15..382.2

##### almhsetmax

Maximum relative humidity threshold for triggering the **almh** alarm event messages.

-   **action** - Action type, integer.

    -   0 - query parameter
    -   1 - query response
    -   2 - program parameter
    -   3 - programming confirmation

-   **max_rh** - maximum humidity threshold in %, float 0..100

##### almhsetmin

Minimum relative humidity threshold for triggering the **almh** alarm event messages.

-   **action** - Action type, integer.

    -   0 - query parameter
    -   1 - query response
    -   2 - program parameter
    -   3 - programming confirmation

-   **min_rh** - minimum humidity threshold in %, float 0..100

##### almio1set

Maximum and minimum voltage thresholds for triggering the **alm_io1** alarm event messages.

-   **action** - Action type, integer.

    -   0 - query parameter
    -   1 - query response
    -   2 - program parameter
    -   3 - programming confirmation

-   **max_io1_th** - maximum voltage threshold on IO1 in V, integer 0..99
-   **min_io1_th** - maximum voltage threshold on IO1 in V, integer 0..99

##### almio2set

Maximum and minimum voltage thresholds for triggering the **alm_io2** alarm event messages.

-   **action** - Action type, integer.

    -   0 - query parameter
    -   1 - query response
    -   2 - program parameter
    -   3 - programming confirmation

-   **max_io2_th** - maximum voltage threshold on IO2 in V, integer 0..99
-   **min_io2_th** - maximum voltage threshold on IO2 in V, integer 0..99

##### sensorcure

Sensor curing messages. Activates the sensor's heating element.

-   **action** - Action type, integer.

    -   2 - program parameter
    -   3 - programming confirmation

-   **heat_intst** - heater intensity, integer 0..15

##### maintset

Maintenance mode triggering voltage threshold.

-   **action** - Action type, integer.

    -   0 - query parameter
    -   1 - query response
    -   2 - program parameter
    -   3 - programming confirmation

-   **max_mntc** - maximum voltage for triggering maintenance mode in V, integer 0..99
-   **min_mntc** - minimum voltage for triggering maintenance mode in V, integer 0..99

## g4n03rht-encode

**g4n03rht-encode** is a node that encodes CAN frames for G4N03RHT temperature and humidity sensors.

### Inputs

-   Message

    payload object

    by default the node translates and outputs every message that is given on the output in a JSON object with the following keys:

    -   **psn** - The sensor's PSN (product serial number), 4 byte hex string.
    -   **type** - The message type, string.

    Additional keys for programming parameters should also be present depending on message type. These are described in the **Command messages** section.

#### Command messages

These messages are sent to place the sensor network in programming mode or in reporting mode. When the network is operating in programming mode, command messages are sent to query or program the different parameters for each sensor. While operating in programming mode, each sensor also broadcasts unsolicited **prog** messages with a particular action field. Additional fields specific to each of the command message types are detailed below.

##### prog

Programming messages. The sensors network needs to be operating in programming mode in order to respond to command messages.

-   **action** - Action type, integer.
    -   0 - wku: enable programming mode
    -   1 - slp: disable programming mode

##### sysset

System configuration messages. To change any of those options using action type 2, one needs to supply the message type and the **sys_cnf**, **alm_cnf** and **io_fltr** in addition to the modified option.

-   **action** - Action type, integer.

    -   0 - query parameters
    -   2 - program parameters

-   **sys_cnf** - System configuration, integer. Options listed below:

    -   snsr_ena - sensor enabled
    -   io1_mntc - assign IO1 as input for enabling maintenance mode using an external switch
    -   io2_mntc - assign IO2 as input for enabling maintenance mode using an external switch
    -   avg_val_evt - use average temperature and humidity values for alarm event detection
    -   temp_c_bcd - sensor temperature format is °C in BCD
    -   temp_k_bin - sensor temperature format is K x100 in binary

-   **alm_cnf** - Alarm configuration, integer. Options listed below:

    -   led_temp_alm - enable LED blink when the temperature alarm is triggered
    -   led_rh_alm - enable LED blink when the humidity alarm is triggered
    -   led_io_alm - enable LED blink when the IO alarms is triggered
    -   io_temp_alm - temperature events trigger the alarm's assigned IO
    -   io_rh_alm - humidity events trigger the alarm's assigned IO
    -   io_io_alm - IO events trigger the alarm's assigned IO

-   **io_fltr** - Time interval in seconds for the IO voltage hold timer, float.

##### tmpcal

Temperature calibration offset messages. Programming this parameter will add the value of the calibration offset to the reported temperature. Be aware that the relative humidity and dew point calculations are also negatively impacted by programming a non zero value.

-   **action** - Action type, integer.

    -   0 - query parameter
    -   2 - program parameter

-   **temp_cal_ofst** - Temperature calibration offset in °C, float -327.68..+327.67

##### instset

Broadcast and sampling interval for the instantaneous temperature and humidity message **insth**.

-   **action** - Action type, integer.

    -   0 - query parameter
    -   2 - program parameter

-   **ins_int** - sampling interval in seconds, integer 0..16383.75

##### avrset

Broadcast and averaging interval for the average temperature and humidity message **avrth**.

-   **action** - Action type, integer.

    -   0 - query parameter
    -   2 - program parameter

-   **avg_int** - averaging interval in seconds, integer 0..655350

##### almtsetmax

Maximum temperature threshold for triggering the **almt** alarm event messages.

-   **action** - Action type, integer.

    -   0 - query parameter
    -   2 - program parameter

-   **max_temp_th** - maximum temperature threshold in °C/K, float -273.15..382.2

##### almtsetmin

Minimum temperature threshold for triggering the **almt** alarm event messages.

-   **action** - Action type, integer.

    -   0 - query parameter
    -   2 - program parameter

-   **min_temp_th** - minimum temperature threshold in °C/K, float -273.15..382.2

##### almhsetmax

Maximum relative humidity threshold for triggering the **almh** alarm event messages.

-   **action** - Action type, integer.

    -   0 - query parameter
    -   2 - program parameter

-   **max_rh** - maximum humidity threshold in %, float 0..100

##### almhsetmin

Minimum relative humidity threshold for triggering the **almh** alarm event messages.

-   **action** - Action type, integer.

    -   0 - query parameter
    -   2 - program parameter

-   **min_rh** - minimum humidity threshold in %, float 0..100

##### almio1set

Maximum and minimum voltage thresholds for triggering the **alm_io1** alarm event messages.

-   **action** - Action type, integer.

    -   0 - query parameter
    -   2 - program parameter

-   **max_io1_th** - maximum voltage threshold on IO1 in V, integer 0..99
-   **min_io1_th** - maximum voltage threshold on IO1 in V, integer 0..99

##### almio2set

Maximum and minimum voltage thresholds for triggering the **alm_io2** alarm event messages.

-   **action** - Action type, integer.

    -   0 - query parameter
    -   2 - program parameter

-   **max_io2_th** - maximum voltage threshold on IO2 in V, integer 0..99
-   **min_io2_th** - maximum voltage threshold on IO2 in V, integer 0..99

##### sensorcure

Sensor curing messages. Activates the sensor's heating element.

-   **action** - Action type, integer.

    -   2 - program parameter

-   **heat_intst** - heater intensity, integer 0..15

##### maintset

Maintenance mode triggering voltage threshold.

-   **action** - Action type, integer.

    -   0 - query parameter
    -   2 - program parameter

-   **max_mntc** - maximum voltage for triggering maintenance mode in V, integer 0..99
-   **min_mntc** - minimum voltage for triggering maintenance mode in V, integer 0..99

### Outputs

-   CAN frame

    payload object

    The output of this module in the form of a JSON object in **socketcan** format, with the following content:

    ```
    {
        timestamp: 1680699437931,
        ext: true,
        canid: 0x18ff8100,
        dlc: 8,
        rtr: false,
        data: [2,1,0,7,116,96,51,88]
    }
    ```

    -   **canid** - The standard or extended CAN id.
    -   **ext** - Set to true if this is a extended id frame. False otherwise.
    -   **rtr** - Specifies a remote transmission request frame if set to true.
    -   **dlc** - Number of databytes.
    -   **data** - An array with data or null or an empty array if no data.
    -   **timestamp** - Relative timestamp in microseconds

## Sensor_dashboard

**Sensor_dashboard** takes the data provided by the decode node and allows the reading and programming of a connected temperature and humidity sensor using a simple dashboard.

The dashboard node is design to operate by reading existing parameters of a specific sensor identified by PSN and then writing parameters to that specific sensor.

###Inputs
The input node has a dual role. First role is to receive the messages coming from the g4n03rht-decode node. The messages received from the decode node follow the JSON object comprised from a payload with different values and a topic.

Incoming messages take the form of a JSON object with the following keys:
**payload**:

```
{
canid: The sensor canid,
epoch : The sensor  epoch,
type:  The message type, string
}
```

Additional keys for parameters will also be present depending on message type as described in g4n03rht-decode. These are described in the **g4n03rht node**.

The second role is to receive the messages from the gui elements (or simple message injected by user) and act accordingly by triggering sequences of messages sent to the encode node.
The gui messages have a structure that follows these rules:

-   **Message**

**topic**
Incoming messages will have a topic reflecting the ui element control type usually a string type.

```
	topic:"sensor_enable"
```

**payload**
will usually contain only the value or boolean corresponding to the topic

```
 	{
	value: boolean/numeric
	}
```

###Outputs
The output of the first output is connected to the **g4n03rht-encode** and sends the messages needed to comunicate/program with the sensors. The other outputs serve a simple message structure to generic gui elements.While the generic gui elements do not require a topic to receive data and display it they do require they send data with a topic so they may be recognised from other messages using the input node.

-**Message**
**payload**
Incoming messages take the form of a JSON object with the following keys:

```
{
psn:"The sensor's PSN"
canid:"The sensor's canid",
epoch:"The sensor's epoch",
type:"The message type, string"
}
```

Additional keys for parameters will also be present depending on message type as described in **g4n03rht-decode**. These are described in the **g4n03rht-decode node**.

###Topics and command sequence's executed triggered by GUI elements
The name of topics is described below toghether with the action sequence it triggers.

```
Topic: "refresh", Payload: boolean
```

Using a boolean value of true / false it shall trigger a search of sensor psn's on the CAN network, it shall clear all node variable, place the sensors in programming mode and listen to their response. After the dropdown is populated with sensor id's it shall exit programming mode.

```
Topic: "query_psn", Payload: boolean
```

Using a boolean value of true / false it shall trigger the query of a specific sensor, reading its configuration settings.

If the sensor in the CAN network is not in programming mode it shall enter programming mode, wait for the sensor to respond and the execute the queries on it's configuration.After its query sequence is done it shall exit programming mode.

```
Topic: "begin_programming", Payload: boolean
```

Using a boolean value of true / false it shall trigger programming of a specific sensor using the settings displayed on the gui.

If the sensor in the CAN network is not in programming mode it shall enter programming mode, wait for the sensor to respond and the execute the program the new values. After its programming sequence is done it shall exit programming mode.

```
	Topic: "sensor_enable", Payload: boolean
```

Using a boolean value of true / false it shall trigger the change of node variable in order to form new program message.
It enables the sensor reporting.
~Corresponds to the **sysset** type of message, and its a value of the payload as described in **g4n03rht-decode**.~

```
	Topic: "maint_mode_io1", Payload: boolean
```

Using a boolean value of true / false it shall trigger the change of node variable in order to form new program message.
If Io1 is triggered it will place the sensor in maintanence mode.
~Corresponds to the **sysset** type of message, and its a value of the payload as described in **g4n03rht-decode**.~

```
	Topic: "maint_mode_io2", Payload: boolean
```

Using a boolean value of true / false it shall trigger the change of node variable in order to form new program message.
If Io2 is triggered it will place the sensor in maintanence mode.
~Corresponds to the **sysset** type of message, and its a value of the payload as described in **g4n03rht-decode**.~

```
	Topic: "instant_average_val", Payload: boolean
```

Using a boolean value of true / false it shall trigger the change of node variable in order to form new program message.
Changes between instant time reporting or average time reporting.
~Corresponds to the **sysset** type of message, and its a value of the payload as described in **g4n03rht-decode**.~

```
	Topic: "kelvin_celsius_select", Payload: boolean
```

Using a boolean value of true / false it shall trigger the change of node variable in order to form new program message.
Changes between kelvin (default) or celsius reporting. False for celsius , true for Kelvin.
~Corresponds to the **sysset** type of message, and its a value of the payload as described in **g4n03rht-decode**.~

```
	Topic: "temp_led_blink", Payload: boolean
```

Using a boolean value of true / false, it shall trigger the change of the node variable in order to form a new program message.
Changes if the led should blink if temperature threshold are exceeded.
~Corresponds to the **sysset** type of message, and its a value of the payload as described in **g4n03rht-decode**.~

```
	Topic: "humidity_led_blink", Payload: boolean
```

Using a boolean value of true / false, it shall trigger the change of the node variable in order to form a new program message.
Changes if the led should blink if humidity thresholds are exceeded.
~Corresponds to the **sysset** type of message, and its a value of the payload as described in **g4n03rht-decode**.~

```
	Topic: "io_led_blink", Payload: boolean
```

Using a boolean value of true / false, it shall trigger the change of the node variable in order to form a new program message.
~Corresponds to the **sysset** type of message, and its a value of the payload as described in **g4n03rht-decode**.~

```
	Topic: "temp_io_event", Payload: boolean
```

Using a boolean value of true / false, it shall trigger the change of the node variable in order to form a new program message.
~Corresponds to the **sysset** type of message, and its a value of the payload as described in **g4n03rht-decode**.~

```
	Topic: "humidity_io_event", Payload: boolean
```

Using a boolean value of true / false, it shall trigger the change of the node variable in order to form a new program message.
~Corresponds to the **sysset** type of message, and its a value of the payload as described in **g4n03rht-decode**.~

```
	Topic: "io_event_alarm", Payload: boolean
```

Using a boolean value of true / false, it shall trigger the change of the node variable in order to form a new program message.
~Corresponds to the **sysset** type of message, and its a value of the payload as described in **g4n03rht-decode**.~

```
	Topic: "io_filter", Payload: numeric
```

Using a numeric value, io_filter is used to avoid false alarms the voltage must hold the cross-limit value for a specified time interval defined by this parameter.
~Corresponds to the **io_fltr** type of message as described in **g4n03rht-decode**.~

```
	Topic: "temp_cal", Payload: numeric
```

Using a numeric value, temperature calibration is always expressed in Kelvin\*100 regardless the bit set in the parameter. The default value is 0 as the sensor is factory calibrated.
~Corresponds to the **tmpcal** type of message as described in **g4n03rht-decode**.~

```
	Topic: "inst_threshold", Payload: numeric
```

Using a numeric value, represents the value of the transmission interval of the instantaneous reading of temperature and humidity.
~Corresponds to the **instset** type of message as described in **g4n03rht-decode**.~

```
	Topic: "avg_threshold", Payload: numeric
```

Using a numeric value, represents the transmission interval value and calculation of the average temperature and humidity.
~Corresponds to the **avrset** type of message as described in **g4n03rht-decode**.~

```
	Topic: "almt_set_max", Payload: numeric
```

Using a numeric value, represents the maximum temperature threshold used for triggering the alarm.
~Corresponds to the **almtsetmax** type of message as described in **g4n03rht-decode**.~

```
	Topic: "almt_set_min", Payload: numeric
```

Using a numeric value, represents the minimum temperature threshold for triggering the temperature alarm.
~Corresponds to the **almtsetmin** type of message as described in **g4n03rht-decode**.~

```
	Topic: "almh_set_max", Payload: numeric
```

Using a numeric value, represents the maximum threshold value for triggering the humidity alarm.
~Corresponds to the **almhsetmax** type of message as described in **g4n03rht-decode**.~

```
	Topic: "almh_set_min", Payload: numeric
```

Using a numeric value, represents the minimum threshold value for triggering the humidity alarm.
~Corresponds to the **almhsetmin** type of message as described in **g4n03rht-decode**.~

```
	Topic: "max_io1_th_threshold", Payload: numeric
```

Using a numeric value, represents the maximum threshold voltage value used for triggering the voltage alarm on IO1.
~Corresponds to the **almio1set** type of message as described in **g4n03rht-decode**.~

```
	Topic: "min_io1_th_threshold", Payload: numeric
```

Using a numeric value, represents the minimum threshold voltage value used for triggering the voltage alarm on IO1.
~Corresponds to the **almio1set** type of message as described in **g4n03rht-decode**.~

```
	Topic: "max_io2_th_threshold", Payload: numeric
```

Using a numeric value, represents the maximum threshold voltage value used for triggering the voltage alarm on IO2.
~Corresponds to the **almio2set** type of message as described in **g4n03rht-decode**.~

```
	Topic: "min_io2_th_threshold", Payload: numeric
```

Using a numeric value, represents the minimum threshold voltage value used for triggering the voltage alarm on IO2.
~Corresponds to the **almio2set** type of message as described in **g4n03rht-decode**.~

```
	Topic: "activate_sensor_cure", Payload: boolean
```

Using a boolean value of true / false, it shall trigger starts a resistive element from the sensor that raises the sensor temperature to facilitate condensation evaporation.
~Corresponds to the **sensorcure** type of message as described in **g4n03rht-decode**.~

```
	Topic: "trigger_spinner", Payload: string
```

Using a string value of "working" : "done" it shall trigger the css element to indicate that a action is beeing performed, such as a read operation or a write operation.

```
	Topic: "min_maintenance_interval", Payload: numeric
```

Using a numeric value, represents the minimum voltage threshold values for triggering the Maintenance Mode.
~Corresponds to the **maintset** type of message as described in **g4n03rht-decode**.~

```
	Topic: "max_maintenance_interval", Payload: numeric
```

Using a numeric value, represents the minimum voltage threshold values for triggering the Maintenance Mode.
~Corresponds to the **maintset** type of message as described in **g4n03rht-decode**.~

```
	Topic: "Sensor_cure_confirmation", Payload: boolean
```

Using a boolean value of true / false, it indicates the if the the sensors have entered curing mode.The sensors will exit curing mode themselfs after curing has finished. No matter what sensor is selected all of the sensors on the CAN network will enter maintenance mode.

```
	Topic: "Sensor_maintenance_confirmation", Payload: boolean
```

Using a boolean value of true / false, it indicates the if the the sensors have entered maintenance mode.

```
	Topic: "dropdown_list", Payload: array
```

Using an array of strings (detected sensor psn's), it allows the setting of the variable needed to program/ interogate a specific sensor. This list of arrays is re-generated by pressing the refresh button or at the start of the flow. The dashboard places the sensors comunicating on CAN in programming mode and waits for them to respond and adds them to the array. Its shall check that no new psn announces itself by waiting for each sensor to enumerate 3 times and them exit programming mode, allowing sensors to return to normal operation.

```
	Topic: "Query/programming mode ready confirmation", Payload: boolean
```

Using a boolean value of true / false, it indicates the if the the selected sensor has entered programming mode.

```
	Topic: "Sensor id label confirmation", Payload: string
```

Using a string value it displays the selected sensor psn.

```
	Topic: "switch_programming_mode", Payload: boolean
```

Using a boolean value of true / false, it shall trigger entering programming mode manually, generally used for debuging purposes and not present in the example dashboard.
~Corresponds to the **prog** type of message as described in **g4n03rht-decode**.~

###Additional notes
The dashboard node works in conjunction with the **g4n03rht-decode** and **g4n03rht-encode** nodes, forming a system that allows for easy sensor configuration and monitoring.

Please refer to the respective nodes for more detailed information about their functions and how they interact with this node.

Ensure that your sensor and CAN network are properly set up and functioning correctly before using this node.

Proper usage of this node and the programming functions it provides will ensure optimal performance of your sensor and network.
