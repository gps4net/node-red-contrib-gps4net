# node-red-contrib-gps4net

Custom Node-RED nodes for GPS4NET

## g4nrht-decode

**g4nrht-decode** is a node that decodes CAN frames from G4NRHT temperature and humidity sensors to higher level data.

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

## g4nrht-encode

**g4nrht-encode** is a node that encodes CAN frames for G4NRHT temperature and humidity sensors.

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

## g4nrht-dashboard

**g4nrht-dashboard** takes the data provided by the decode node and allows the reading and programming of a connected temperature and humidity sensor using a simple dashboard.

The dashboard node is design to operate by reading existing parameters of a specific sensor identified by PSN and then writing parameters to that specific sensor.

### Inputs

The input node has a dual role. First role is to receive the messages coming from the g4nrht-decode node. The messages received from the decode node follow the JSON object comprised from a payload with different values and a topic.

Incoming messages take the form of a JSON object with the following keys:
**payload**:

-   Message

    payload object

    Input message payload takes the form of a JSON object with the following keys:

    -   **psn** - The sensor's PSN (product serial number), 4 byte hex string.
    -   **canid** - The sample's CAN ID, optional.
    -   **epoch** - The sample's epoch time, 4 byte integer.
    -   **type** - The message type, string.

Additional keys for parameters will also be present depending on message type as described in g4nrht-decode. These are described in the **g4nrht-decode** node.

The second role is to receive the messages from the GUI elements (or simple messages injected by user) and act accordingly by triggering sequences of messages sent to the encode node.
The messages have a structure that follows these rules:

-   **Message**

    - **topic** - Incoming messages will have a topic reflecting the ui element control type usually a string type.
    - **payload** - will usually contain only the numeric or boolean value corresponding to the topic

### Outputs

The output of the first output is connected to the **g4nrht-encode** and sends the messages needed to comunicate/program with the sensors. The other outputs serve a simple message structure to generic gui elements.While the generic gui elements do not require a topic to receive data and display it they do require they send data with a topic so they may be recognised from other messages using the input node.

- **Message**

    payload object

    Output message payload takes the form of a JSON object with the following keys:

    -   **psn** - The sensor's PSN (product serial number), 4 byte hex string.
    -   **canid** - The sample's CAN ID, optional.
    -   **epoch** - The sample's epoch time, 4 byte integer.
    -   **type** - The message type, string.

Additional keys for parameters will also be present depending on message type as described in **g4nrht-decode**.

```
{
    topic: "sensor_enable",
    payload: true|false
}
```

### Topics and command sequences triggered by GUI elements

The name of topics is described below, along with the action sequence it triggers.

```
{
    topic: "refresh",
    payload: true|false
}
```

Using a boolean value of `true` or `false` shall trigger a search of sensor PSNs on the CAN bus, shall clear all node variables, place the sensors in programming mode and wait for their response. After the dropdown is filled with sensor PSNs, it shall exit the programming mode.

```
{
    topic: "query_psn",
    payload: true|false
}
```

Using a boolean value of `true` or `false` shall trigger the query of a specific sensor, reading its configuration settings.

If the sensor in the CAN bus is not in programming mode, it shall be switched to programming mode. After the sensor's response, commands shall be sent to query  its configuration. Finally, when the query sequence is complete the sensor will be switched back to reporting mode.

```
{
    topic: "begin_programming",
    payload: true|false
}
```

Using a boolean value of `true` or `false` shall trigger programming of a specific sensor using the settings displayed on the GUI.

If the sensor in the CAN bus is not in programming mode, it shall be switched to programming mode. After the sensor's response, commands shall be sent to query  its configuration. Finally, when the query sequence is complete the sensor will be switched back to reporting mode.

```
{
	topic: "sensor_enable",
    payload: true|false
}
```

 The `sensor_enable` message enables sensor reporting. This issues a message of the **sysset** type, with its content as described in **g4nrht-decode**.

```
{
	topic: "maint_mode_io1",
    payload: true|false
}
```

 If IO1 is triggered it will place the sensor into maintanence mode. This issues a message of the **sysset** type, with its content as described in **g4nrht-decode**.

```
{
	topic: "maint_mode_io2",
    payload: true|false
}
```

 If IO2 is triggered it will place the sensor into maintanence mode. This issues a message of the **sysset** type, with its content as described in **g4nrht-decode**.


```
{
	topic: "instant_average_val",
    payload: true|false
}
```

 Changes between instantaneous or average value reporting. This issues a message of the **sysset** type, with its content as described in **g4nrht-decode**.

```
{
	topic: "kelvin_celsius_select",
    payload: true|false
}
```

 Changes between Kelvin (default) or Celsius temperature reporting. False for celsius, true for Kelvin. This issues a message of the **sysset** type, with its content as described in **g4nrht-decode**.


```
{
	topic: "temp_led_blink",
    payload: true|false
}
```

 
Toggles if the LED should blink when one of the temperature thresholds is exceeded. This issues a message of the **sysset** type, with its content as described in **g4nrht-decode**.

```
{
	topic: "humidity_led_blink",
    payload: true|false
}
```

Toggles if the LED should blink when one of the humidity thresholds is exceeded. This issues a message of the **sysset** type, with its content as described in **g4nrht-decode**.

```
{
	topic: "io_led_blink",
    payload: true|false
}
```

Toggles if the LED should blink when one of the I/O voltage thresholds is exceeded. This issues a message of the **sysset** type, with its content as described in **g4nrht-decode**.


```
{
	topic: "temp_io_event",
    payload: true|false
}
```

Toggles if an I/O event is triggered when one of the temperature thresholds is exceeded. This issues a message of the **sysset** type, with its content as described in **g4nrht-decode**.

```
{
	topic: "humidity_io_event",
    payload: true|false
}
```

Toggles if an I/O event is triggered when one of the humidity thresholds is exceeded. This issues a message of the **sysset** type, with its content as described in **g4nrht-decode**.

```
{
	topic: "io_event_alarm",
    payload: true|false
}
```

Toggles if an I/O event is triggered when one of the I/O voltage thresholds is exceeded. This issues a message of the **sysset** type, with its content as described in **g4nrht-decode**.

```
{
	topic: "io_filter",
    payload: numeric
}
```

The `io_filter` value (in seconds) is used to avoid false alarms. The voltage must hold the cross-limit value for a specified time interval defined by this parameter. This issues a message of the **sysset** type, with its content as described in **g4nrht-decode**.

```
{
	topic: "temp_cal",
    payload: numeric
}
```

The `temp_cal` temperature calibration offset is always expressed in in °C/K regardless the bit set in the parameter. The default value is 0 as the sensor is factory calibrated. This issues a message of the **tmpcal** type, with its content as described in **g4nrht-decode**.

```
{
	topic: "inst_threshold",
    payload: numeric
}
```

The `inst_threshold` parameter represents the sampling and transmission interval (in seconds) of the instantaneous temperature and humidity. This issues a message of the **instset** type, with its content as described in **g4nrht-decode**.

```
{
	topic: "avg_threshold",
    payload: numeric
}
```

The `avg_threshold` represents the averaging and transmission interval (in seconds) of the average temperature and humidity. This issues a message of the **avrset** type, with its content as described in **g4nrht-decode**.

```
{
	topic: "almt_set_max",
    payload: numeric
}
```

The `almt_set_max` parameter represents the maximum temperature threshold (in °C/K) used for triggering the alarm. This issues a message of the **almtsetmax** type, with its content as described in **g4nrht-decode**.

```
{
	topic: "almt_set_min",
    payload: numeric
}
```

The `almt_set_min` parameter represents the minimum temperature threshold (in °C/K) used for triggering the alarm. This issues a message of the **almtsetmin** type, with its content as described in **g4nrht-decode**.

```
{
	topic: "almh_set_max",
    payload: numeric
}
```

The `almh_set_max` parameter represents the maximum humidity threshold (in %) used for triggering the alarm.
This issues a message of the **almhsetmax** type, with its content as described in **g4nrht-decode**.

```
{
	topic: "almh_set_min",
    payload: numeric
}
```

The `almh_set_min` parameter represents the minimum humidity threshold (in %) used for triggering the alarm.
This issues a message of the **almhsetmin** type, with its content as described in **g4nrht-decode**.

```
{
	topic: "max_io1_th_threshold",
    payload: numeric
}
```

The `max_io1_th_threshold` parameter represents the maximum IO1 voltage threshold (in V) used for triggering the alarm. This issues a message of the **almio1set** type, with its content as described in **g4nrht-decode**.

```
{
	topic: "min_io1_th_threshold",
    payload: numeric
}
```

The `min_io1_th_threshold` parameter represents the minimum IO1 voltage threshold (in V) used for triggering the alarm. This issues a message of the **almio1set** type, with its content as described in **g4nrht-decode**.


```
{
	topic: "max_io2_th_threshold",
    payload: numeric
}
```

The `max_io2_th_threshold` parameter represents the maximum IO2 voltage threshold (in V) used for triggering the alarm. This issues a message of the **almio2set** type, with its content as described in **g4nrht-decode**.

```
{
	topic: "min_io2_th_threshold",
    payload: numeric
}
```

The `min_io2_th_threshold` parameter represents the minimum IO2 voltage threshold (in V) used for triggering the alarm. This issues a message of the **almio2set** type, with its content as described in **g4nrht-decode**.

```
{
	topic: "activate_sensor_cure",
    payload: true|false
}
```

This toggles a resistive element in the sensor that heats it in order to facilitate condensation evaporation o that it does not adversely influence humidity readings.  This issues a message of the **sensorcure** type, with its content as described in **g4nrht-decode**.

```
{
	topic: "trigger_spinner",
    payload: string
}
```

Using a string value of `working` or `done` it shall trigger the spinner element to indicate that an action is being performed on the sensor, such as a read or write operation.

```
{
	topic: "min_maintenance_interval",
    payload: numeric
}
```

The `min_maintenance_interval` represents the minimum voltage threshold value (in V) for triggering maintenance mode. This issues message of the **maintset** type, with its content as described in **g4nrht-decode**.

```
{
	topic: "max_maintenance_interval",
    payload: numeric
}
```

The `min_maintenance_interval` represents the maximum voltage threshold value (in V) for triggering maintenance mode. This issues message of the **maintset** type, with its content as described in **g4nrht-decode**.

```
{
	topic: "sensor_cure_confirmation",
    payload: boolean
}
```

The `sensor_cure_confirmation` parameter indicates the if the sensor has entered curing mode. The sensor switch curing mode off by themselves after completion. 

```
{
	topic: "sensor_maintenance_confirmation",
    payload: boolean
}
```

The `sensor_maintenance_confirmation` parameter indicates the if the sensor has entered mainenance mode.
No matter whch sensor is selected, all of the sensors on the CAN bus will enter maintenance mode.

```
{
	topic: "dropdown_list",
    payload: array
}
```

This control allows the querying or programming of a specific sensor, using an array of strings (detected sensor PSNs). This list is always generated at the start of the flow or by pressing the refresh button. The dashboard places the sensors on the CAN bus in programming mode and waits for their responses to add them to the list. It checks that no new PSN announces itself by waiting for each sensor to announce itself three times and then exits programming mode, allowing sensors to return to normal operation.

```
{
	topic: "query/programming mode ready confirmation", payload: true|false
}
```

This control indicates whether the selected sensor has entered programming mode.

```
{
	topic: "sensor id label confirmation",
    payload: string
}
```

This control displays the selected sensor's PSN.

```
{
	topic: "switch_programming_mode",
    payload: true|false
}
```

This control triggers programming mode manually. It's generally used for debuging purposes and not present in the example dashboard. This issues a message of the **prog** type, with its content as described in **g4nrht-decode**.

### Additional notes

The dashboard node works in conjunction with the **g4nrht-decode** and **g4nrht-encode** nodes, forming a system that allows for easy sensor configuration and monitoring.

Please refer to the respective nodes for more detailed information about their functions and how they interact with this node.

Ensure that your sensor and CAN bus are properly set up and functioning correctly before using this node.

Proper usage of this node and the programming functions it provides will ensure optimal performance of your sensor and network.
