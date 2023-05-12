module.exports = function (RED) {
	function sensorRead(config) {
		RED.nodes.createNode(this, config);
		var node = this;

		node.on("input", function (msg, send, done) {
			//defining variables
			if (!node.context().flow) {
				node.context().flow = {};
			}
			//have to be here for sysset
			node.context().flow.get("sys_cnf") || 0;
			node.context().flow.get("alm_cnf") || 0;
			node.context().flow.get("io_fltr") || 0;
			node.context().flow.get("psnArray") || [];
			node.context().flow.get("stopPopulate") || false;
			node.context().flow.get("optionsList") || "";
			node.context().flow.get("canQuery") || false;
			node.context().flow.get("currentPsn" || "");
			node.context().flow.get("psnSelected") || "";
			node.context().flow.get("lastReadPsn") || [];
			//defining outputs
			node.context().flow.get("full_parameter_query") || false;
			node.context().flow.get("enable_sensor") || false;
			node.context().flow.get("allow_maint_mode_io1") || false;
			node.context().flow.get("allow_maint_mode_io2") || false;
			node.context().flow.get("instant_average_val") || false;
			node.context().flow.get("kelvin_celsius_select") || false;
			node.context().flow.get("temp_led_blink") || false;
			node.context().flow.get("humidity_led_blink") || false;
			node.context().flow.get("io_led_blink") || false;
			node.context().flow.get("temp_io_event") || false;
			node.context().flow.get("humidity_io_event") || false;
			node.context().flow.get("io_event_alarm") || false;
			node.context().flow.get("io_filter") || 0;
			node.context().flow.get("temp_cal") || 0;
			node.context().flow.get("inst_threshold") || 0;
			node.context().flow.get("avg_threshold") || 0;
			node.context().flow.get("almt_set_max") || 0;
			node.context().flow.get("almt_set_min") || 0;
			node.context().flow.get("almh_set_max") || 0;
			node.context().flow.get("almh_set_min") || 0;
			node.context().flow.get("min_io1_th_threshold") || 0;
			node.context().flow.get("max_io1_th_threshold") || 0;
			node.context().flow.get("min_io2_th_threshold") || 0;
			node.context().flow.get("max_io2_th_threshold") || 0;
			node.context().flow.get("min_maintenance_interval") || 0;
			node.context().flow.get("max_maintenance_interval") || 0;
			node.context().flow.get("threshold_psn") || 1;
			node.context().flow.get("monitor_prog_mode") || false;
			node.context().flow.get("previousValueCure") || false;
			node.context().flow.get("previousPayload") || false;
			//gui buttons
			node.context().flow.get("switch_programming_mode") || false;
			node.context().flow.get("previousValueProg") || false;
			node.context().flow.get("programmingMode") || false;
			node.context().flow.get("activate_sensor_cure") || false;
			node.context().flow.get("full_parameter_write") || false;
			node.context().flow.get("psnCounter") || 0;
			//monitoring
			node.context().flow.get("monitoringLoopActive") || false;

			// Include the flowKeys array in the input message
			getvar_dropdown_list(node, msg);
			populateSensorList(node, msg); //returns msg.option with a psn list // feed this into the output of Combobox
			//enters or exits programming mode if the button with the topic "enter_programing" is pressed
			if (msg.payload !== undefined) {
				enterProgramingMode(node, msg);
				checkifSensorResponded(node, msg);
				// populate gui elements with msg answers from sensor
				gui_combined(node, msg);
				monitorCanQuery(node);
				//read and store the changes we do on interface
				get_variables(node, msg);
				getvar_switch_programming_mode(node, msg);
				//select a psn from the list
				refresh_list_and_clear_vars(node, msg);
				activate_sensor_cure(node, msg);
				check_status_sensor_cure(node, msg);
				check_status_maintenance(node, msg);
				//read a  sensor
				query_Sensor(node, msg);
				//program a sensor
				program_sensor(node, msg);
			}
		});
	}

	function triggerSpinner(node, show) {
		var newMsg = {
			payload: show ? "working" : "done",
		};
		sendToOutput(node, 25, newMsg.payload);
	}

	function triggerSpinnerQueryReady(node, show) {
		var newMsg = {
			payload: show ? "working" : "done",
		};
		sendToOutput(node, 31, newMsg.payload);
	}

	function triggerSpinnerMaintenance(node, show) {
		var newMsg = {
			payload: show ? "working" : "done",
		};
		sendToOutput(node, 28, newMsg.payload);
	}

	function triggerSpinnerCure(node, show) {
		var newMsg = {
			payload: show ? "working" : "done",
		};
		sendToOutput(node, 29, newMsg.payload);
	}

	function sendToOutput(node, outputIndex, payload) {
		// Create an array with null values for all outputs, except for the target output
		var outputs = new Array(33).fill(null);
		outputs[outputIndex] = { payload: payload };
		if (outputs[outputIndex].hasOwnProperty("_msgid")) {
			delete outputs[outputIndex]._msgid;
		}
		node.send(outputs);
	}

	function sendToOutput2(node, outputIndex, topic, payload, options) {
		// Create an array with null values for all outputs, except for the target output
		var outputs = new Array(33).fill(null);
		outputs[outputIndex] = {
			topic: topic,
			payload: payload,
			options: options,
		};

		if (outputs[outputIndex].hasOwnProperty("_msgid")) {
			delete outputs[outputIndex]._msgid;
		}
		node.send(outputs);
	}

	async function populateSensorList(node, msg) {
		try {
			var stopPopulate = node.context().flow.get("stopPopulate") || false;
			var psnArray = node.context().flow.get("psnArray") || [];
			var psnCounter = node.context().flow.get("psnCounter") || {};
			var programmingMode = node.context().flow.get("programmingMode") || false;
		} catch {}

		try {
			var currentPsn = msg.payload.psn;
		} catch {
			currentPsn = null;
		}
		try {
			if (currentPsn !== null && currentPsn !== undefined && currentPsn !== "FFFFFFFF") {
				if (psnArray.indexOf(currentPsn) === -1) {
					psnArray.push(currentPsn);
					node.context().flow.set("psnArray", psnArray);
					// Initialize counter for the new currentPsn value
					psnCounter[currentPsn] = 1;
				} else {
					// Increment the counter for the currentPsn value
					psnCounter[currentPsn] = (psnCounter[currentPsn] || 0) + 1;
				}
				node.context().flow.set("psnCounter", psnCounter);

				var threshold = 3; // Set the threshold value as per your requirement

				if (psnCounter[currentPsn] === threshold) {
					if (!programmingMode) {
						let newmsg0 = {
							topic: "switch_programming_mode",
							payload: true,
						};
						programmingMode = true;
						node.context().flow.set("programmingMode", programmingMode);
						enterProgramingMode(node, newmsg0);
					}

					psnArray = psnArray.filter((psn) => psn !== null && psn !== undefined);
					msg.payload = psnArray.map((psn, index) => {
						return { value: psn };
					});

					var filtered = [];

					filtered = psnArray.filter((psn) => psn !== null && psn !== undefined);

					msg.options = filtered.map((psn, index) => {
						return { value: psn };
					});

					msg.options1 = psnArray;

					var newMsg = {
						_msgid: msg._msgid,
						topic: "fromfunction_dropdown_list",
						payload: {
							topic: "dropdown_list",
							payload: msg.payload,
							options: msg.options,
						},
						options: msg.options1,
					};

					if (!stopPopulate) {
						let timeoutId = setTimeout(() => {
							sendToOutput2(node, 30, newMsg.topic, newMsg.payload, newMsg.options);
						}, 100); // Adjust the delay value (100ms) as needed

						// Clear the timeout when stopPopulate is true
						if (node.context().flow.get("stopPopulate")) {
							clearTimeout(timeoutId);
						}
					} else {
						//exit
						if (programmingMode) {
							//enterprogramming node
							let newmsg0 = {
								topic: "switch_programming_mode",
								payload: false,
							};
							programmingMode = false;

							enterProgramingMode(node, newmsg0);
							node.context().flow.set("programmingMode", programmingMode);
						}
					}
				}
			}
		} catch {
			if (programmingMode) {
				//exiting node
				let newmsg0 = {
					topic: "switch_programming_mode",
					payload: false,
				};
				programmingMode = false;

				enterProgramingMode(node, newmsg0);
				node.context().flow.set("programmingMode", programmingMode);
			}
		}
	}

	//monitor if the device was more than 5 minutes in programming mode and if so set if off programming mode
	async function monitorCanQuery(node) {
		// Check if the monitoring loop is already running
		let monitoringLoopActive = node.context().flow.get("monitoringLoopActive") || false;

		if (!monitoringLoopActive) {
			// Set the flag to indicate the monitoring loop is now running
			node.context().flow.set("monitoringLoopActive", true);

			while (true) {
				await new Promise((resolve) => {
					setTimeout(async () => {
						try {
							let canQuery = node.context().flow.get("canQuery");
							let lastCheckedTime = node.context().flow.get("lastCheckedTime") || Date.now();

							if (canQuery) {
								let elapsedTime = Date.now() - lastCheckedTime;

								if (elapsedTime >= 5 * 60 * 1000) {
									// 5 minutes
									let newmsg4 = {
										topic: "switch_programming_mode",
										payload: false,
									};
									enterProgramingMode(node, newmsg4);

									node.context().flow.set("lastCheckedTime", Date.now());
								}
							} else {
								node.context().flow.set("lastCheckedTime", Date.now());
							}

							resolve();
						} catch (error) {
							node.warn("Error in monitorCanQuery function:", error);
							resolve();
						}
					}, 5000); // Check every 5 seconds
				});
			}
		}
	}

	function enterProgramingMode(node, msg) {
		if (msg.topic === "switch_programming_mode") {
			let previousValueProg = node.context().flow.get("previousValueProg") || false;

			if (msg.payload !== previousValueProg) {
				if (msg.payload === true) {
					msg.payload = {
						type: "prog",
						action: 0,
					};
					sendToOutput(node, 0, msg.payload);
				} else {
					msg.payload = {
						type: "prog",
						action: 1,
					};
					sendToOutput(node, 0, msg.payload);
				}

				// Store the current payload value as the previous value for future comparisons
				node.context().flow.set("previousValueProg", msg.payload);
			}
		}
	}

	function checkifSensorResponded(node, msg) {
		try {
			var psnSelected = node.context().flow.get("psnSelected");
			var action = msg.payload.action;
			var psnInResponse = msg.payload.psn;
			var type = msg.payload.type;
			var previousPayload = node.context().flow.get("previousPayload") || false;
		} catch {}

		if (psnSelected === psnInResponse && action === 241) {
			node.context().flow.set("canQuery", true);

			var newMsg = {
				topic: "switch_programming_mode",
				payload: true,
				options: "no_options",
			};

			if (previousPayload !== newMsg.payload) {
				triggerSpinnerQueryReady(node, true);
				node.context().flow.set("previousPayload", newMsg.payload);
			}
		}

		if (psnSelected === psnInResponse && action === 65 && msg.payload.prog_mode === false) {
			var newMsg = {
				topic: "switch_programming_mode",
				payload: false,
				options: "no_options",
			};

			if (previousPayload !== newMsg.payload) {
				triggerSpinnerQueryReady(node, false);
				node.context().flow.set("previousPayload", newMsg.payload);
			}
		}

		if (type === "insio" || type === "insth") {
			var newMsg = {
				topic: "switch_programming_mode",
				payload: false,
				options: "no_options",
			};

			if (previousPayload !== newMsg.payload) {
				triggerSpinnerQueryReady(node, false);
				node.context().flow.set("previousPayload", newMsg.payload);
			}
		}
	}

	async function query_Sensor(node, msg) {
		if (msg.topic === "query_psn") {
			node.context().flow.set("full_parameter_query", true);

			try {
				var psnSelected = node.context().flow.get("psnSelected");
				var previousValueProg = node.context().flow.get("previousValueProg");
			} catch {}

			if (previousValueProg !== true) {
				let newmsg = {
					topic: "switch_programming_mode",
					payload: true,
				};
				enterProgramingMode(node, newmsg);
				while (node.context().flow.get("canQuery") !== true) {
					await delay(1000); // Check every 100ms
				}
			}
			try {
				var canQuery = node.context().flow.get("canQuery");
			} catch {}
			node.context().flow.set("full_parameter_query", true);

			if (canQuery === true) {
				// If we have a psn, we shall begin to compose query msg to the specific psn
				if (psnSelected === undefined || psnSelected === "FFFFFFFF" || psnSelected === "") {
					return null;
				} else {
					if (node.context().flow.get("full_parameter_query") === true) {
						triggerSpinner(node, true);

						msg.payload = {
							psn: psnSelected,
							type: "sysset",
							action: 1,
						};
						setTimeout(() => {
							sendToOutput(node, 0, msg.payload);
						}, 500);
						await delay(500);

						msg.payload = {
							psn: psnSelected,
							type: "tmpcal",
							action: 1,
						};
						setTimeout(() => {
							sendToOutput(node, 0, msg.payload);
						}, 500);
						await delay(500);

						msg.payload = {
							psn: psnSelected,
							type: "avrset",
							action: 1,
						};
						setTimeout(() => {
							sendToOutput(node, 0, msg.payload);
						}, 500);
						await delay(500);

						msg.payload = {
							psn: psnSelected,
							type: "instset",
							action: 1,
						};
						setTimeout(() => {
							sendToOutput(node, 0, msg.payload);
						}, 500);
						await delay(500);

						msg.payload = {
							psn: psnSelected,
							type: "almtsetmax",
							action: 1,
						};
						setTimeout(() => {
							sendToOutput(node, 0, msg.payload);
						}, 500);
						await delay(500);

						msg.payload = {
							psn: psnSelected,
							type: "almtsetmin",
							action: 1,
						};
						setTimeout(() => {
							sendToOutput(node, 0, msg.payload);
						}, 500);
						await delay(500);

						msg.payload = {
							psn: psnSelected,
							type: "almhsetmax",
							action: 1,
						};
						setTimeout(() => {
							sendToOutput(node, 0, msg.payload);
						}, 500);
						await delay(500);

						msg.payload = {
							psn: psnSelected,
							type: "almhsetmin",
							action: 1,
						};
						setTimeout(() => {
							sendToOutput(node, 0, msg.payload);
						}, 500);
						await delay(500);

						msg.payload = {
							psn: psnSelected,
							type: "almio1set",
							action: 1,
						};
						setTimeout(() => {
							sendToOutput(node, 0, msg.payload);
						}, 500);
						await delay(500);

						msg.payload = {
							psn: psnSelected,
							type: "almio2set",
							action: 1,
						};
						setTimeout(() => {
							sendToOutput(node, 0, msg.payload);
						}, 500);
						await delay(500);

						msg.payload = {
							psn: psnSelected,
							type: "maintset",
							action: 1,
						};
						setTimeout(() => {
							sendToOutput(node, 0, msg.payload);
						}, 500);
						await delay(500);

						let newmsg = {
							topic: "switch_programming_mode",
							payload: false,
						};
						setTimeout(() => {
							enterProgramingMode(node, newmsg);
						}, 500);

						// Create a new array with the current psnSelected and set its value to true
						let lastReadPsn = [{ psn: psnSelected, read: true }];
						// Save the new lastReadPsn array to the flow context
						node.context().flow.set("lastReadPsn", lastReadPsn);

						triggerSpinner(node, false);
					}
				}
			}
		}
	}

	function delay(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	function gui_combined(node, msg) {
		try {
			var action = msg.payload.action;
		} catch {}
		try {
			var type = msg.payload.type;
		} catch {}

		if (type !== undefined && action === 2) {
			switch (type) {
				case "sysset":
					var sensor_enabled = msg.payload.snsr_ena || false;
					var maint_io1_swich = msg.payload.io1_mntc || false;
					var maint_io2_swich = msg.payload.io2_mntc || false;
					var avg_val_evt = msg.payload.avg_val_evt || false;
					var kelvin_celsius = msg.payload.temp_k_bin || false;
					var temperature_led_blink = msg.payload.led_temp_alm || false;
					var humidity_led_blink = msg.payload.led_rh_alm || false;
					var io_led_blink_alarm = msg.payload.led_io_alm || false;
					var io_temp_alm = msg.payload.io_temp_alm || false;
					var io_rh_alm = msg.payload.io_rh_alm || false;
					var io_io_alm = msg.payload.io_io_alm || false;
					var io_fltr = msg.payload.io_fltr || 0;
					var sys_cnf = msg.payload.alm_cnf || 0;
					var alm_cnf = msg.payload.alm_cnf || 0;
					var io_fltr1 = msg.payload.io_fltr || 0;

					sendToOutput(node, 1, sensor_enabled);
					node.context().flow.set("sensor_enable", sensor_enabled);

					sendToOutput(node, 2, maint_io1_swich);
					node.context().flow.set("allow_maint_mode_io1", maint_io1_swich);

					sendToOutput(node, 3, maint_io2_swich);
					node.context().flow.set("allow_maint_mode_io2", maint_io2_swich);

					sendToOutput(node, 4, avg_val_evt);
					node.context().flow.set("instant_average_val", avg_val_evt);

					sendToOutput(node, 5, kelvin_celsius);
					node.context().flow.set("kelvin_celsius_select", kelvin_celsius);

					sendToOutput(node, 6, temperature_led_blink);
					node.context().flow.set("temp_led_blink", temperature_led_blink);

					sendToOutput(node, 7, humidity_led_blink);
					node.context().flow.set("humidity_led_blink", humidity_led_blink);

					sendToOutput(node, 8, humidity_led_blink);
					node.context().flow.set("led_blink", io_led_blink_alarm);

					sendToOutput(node, 9, io_temp_alm);
					node.context().flow.set("temp_io_event", io_temp_alm);

					sendToOutput(node, 10, io_rh_alm);
					node.context().flow.set("humidity_io_event", io_rh_alm);

					sendToOutput(node, 11, io_io_alm);
					node.context().flow.set("io_event_alarm", io_io_alm);

					sendToOutput(node, 12, io_fltr);
					node.context().flow.set("io_filter", io_fltr);
					//
					node.context().flow.set("sys_cnf", sys_cnf);
					node.context().flow.set("alm_cnf", alm_cnf);
					node.context().flow.set("io_fltr", io_fltr1);
					break;
				case "tmpcal":
					sendToOutput(node, 13, msg.payload.temp_cal_ofst || 0);
					break;
				case "instset":
					sendToOutput(node, 14, msg.payload.ins_int || 0);
					node.context().flow.set("inst_threshold", msg.payload.ins_int || 0);
					break;
				case "avrset":
					sendToOutput(node, 15, msg.payload.avg_int || 0);
					node.context().flow.set("avg_threshold", msg.payload.avg_int || 0);
					break;
				case "almtsetmax":
					sendToOutput(node, 16, msg.payload.max_temp_th || 0);
					break;
				case "almtsetmin":
					sendToOutput(node, 17, msg.payload.min_temp_th || 0);
					break;
				case "almhsetmax":
					sendToOutput(node, 18, msg.payload.max_rh_th || 0);
					break;
				case "almhsetmin":
					sendToOutput(node, 19, msg.payload.min_rh_th || 0);
					break;
				case "almio1set":
					sendToOutput(node, 21, msg.payload.min_io1_th || 0);
					sendToOutput(node, 20, msg.payload.max_io1_th || 0);
					break;
				case "almio2set":
					sendToOutput(node, 22, msg.payload.max_io2_th || 0);
					sendToOutput(node, 23, msg.payload.min_io2_th || 0);
					break;
				case "maintset":
					sendToOutput(node, 26, msg.payload.min_mntc || 0);
					sendToOutput(node, 27, msg.payload.max_mntc || 0);
					break;
			}
		}
		if (msg.topic === "refresh_list") {
			for (let i = 11; i <= 27; i++) {
				if (i === 24 || i === 25) continue;
				sendToOutput(node, i, 0);
			}

			sendToOutput(node, 1, false);
			sendToOutput(node, 2, false);
			sendToOutput(node, 3, false);
			sendToOutput(node, 4, false);
			sendToOutput(node, 5, false);
			sendToOutput(node, 6, false);
			sendToOutput(node, 7, false);
			sendToOutput(node, 8, false);
			sendToOutput(node, 9, false);
			sendToOutput(node, 10, false);
			sendToOutput(node, 11, false);
			triggerSpinner(node, false);
			let msgToLabel = {
				payload: "none",
			};

			sendToOutput(node, 32, msgToLabel.payload);

			var clearDropdown = {
				_msgid: msg._msgid,
				topic: "clearfunction_dropdown_list",
				payload: {
					topic: "dropdown_list",
					payload: "",
					options: "",
				},
				options: "",
			};
			sendToOutput2(node, 30, clearDropdown.topic, clearDropdown.payload, clearDropdown.options);
		}
	}

	//receive gui mods and change the set values in preparation for write
	function get_variables(node, msg) {
		try {
			var psnSelected = node.context().flow.get("psnSelected");

			if (psnSelected === undefined) {
				psn = "none";
			} else {
				psn = psnSelected;
			}
			let label = "Sensor id: " + psn;

			let msgToLabel = {
				payload: label,
			};

			sendToOutput(node, 32, msgToLabel.payload);
		} catch {}
		switch (msg.topic) {
			case "sensor_enable":
				node.context().flow.set("enable_sensor", msg.payload);
				break;
			case "maint_mode_io1":
				node.context().flow.set("maint_mode_io1", msg.payload);
				break;
			case "maint_mode_io2":
				node.context().flow.set("maint_mode_io2", msg.payload);
				break;
			case "instant_average_val":
				node.context().flow.set("instant_average_val", msg.payload);
				break;
			case "kelvin_celsius_select":
				node.context().flow.set("kelvin_celsius_select", msg.payload);
				break;
			case "temp_led_blink":
				node.context().flow.set("temp_led_blink", msg.payload);
				break;
			case "humidity_led_blink":
				node.context().flow.set("humidity_led_blink", msg.payload);
				break;
			case "io_led_blink":
				node.context().flow.set("io_led_blink", msg.payload);
				break;
			case "temp_io_event":
				node.context().flow.set("temp_io_event", msg.payload);
				break;
			case "humidity_io_event":
				node.context().flow.set("humidity_io_event", msg.payload);
				break;
			case "io_event_alarm":
				node.context().flow.set("io_event_alarm", msg.payload);
				break;
			case "io_filter":
				node.context().flow.set("io_filter", msg.payload);
				break;
			case "temp_cal":
				node.context().flow.set("temp_cal", msg.payload);
				break;
			case "inst_threshold":
				node.context().flow.set("inst_threshold", msg.payload);
				break;
			case "avg_threshold":
				node.context().flow.set("avg_threshold", msg.payload);
				break;
			case "almt_set_max":
				node.context().flow.set("almt_set_max", msg.payload);
				break;
			case "almt_set_min":
				node.context().flow.set("almt_set_min", msg.payload);
				break;
			case "almh_set_max":
				node.context().flow.set("almh_set_max", msg.payload);
				break;
			case "almh_set_min":
				node.context().flow.set("almh_set_min", msg.payload);
				break;
			case "max_io1_th_threshold":
				node.context().flow.set("max_io1_th_threshold", msg.payload);
				break;
			case "min_io1_th_threshold":
				node.context().flow.set("min_io1_th_threshold", msg.payload);
				break;
			case "max_io2_th_threshold":
				node.context().flow.set("max_io2_th_threshold", msg.payload);
				break;
			case "min_io2_th_threshold":
				node.context().flow.set("min_io2_th_threshold", msg.payload);
				break;
			case "sensor_heat_max_power":
				node.context().flow.set("sensor_heat_max_power", msg.payload);
				break;
			case "sensor_heat_min_power":
				node.context().flow.set("sensor_heat_min_power", msg.payload);
				break;
			case "min_maintenance_interval":
				node.context().flow.set("min_maintenance_interval", msg.payload);
				break;
			case "max_maintenance_interval":
				node.context().flow.set("max_maintenance_interval", msg.payload);
				break;
			case "cure_sensor_intensity":
				node.context().flow.set("cure_sensor_intensity", msg.payload);
				break;
		}
	}

	function getvar_switch_programming_mode(node, msg) {
		try {
			var triggeredBy = msg.triggeredBy;
		} catch {
			triggeredBy = "user";
		}
		if (triggeredBy === undefined || triggeredBy === null) {
			triggeredBy = "user";
		}

		if (msg.topic === "switch_programming_mode" && triggeredBy === "user") {
			node.context().flow.set("switch_programming_mode", msg.payload);
		}
	}

	function getvar_dropdown_list(node, msg) {
		//set the selected PSN
		try {
			if (msg.topic === "dropdown_list_g") {
				var psnSelected = msg.payload;
				if (msg.topic === "dropdown_list" && msg.payload !== undefined && msg.payload !== "") {
					var psnSelected = msg.payload;
					node.context().flow.set("currentPsn", psnSelected);
					node.context().flow.set("psnSelected", psnSelected);
					node.context().flow.set("stopPopulate", true);
				}
				node.context().flow.set("currentPsn", psnSelected);
				node.context().flow.set("psnSelected", psnSelected);
				clear_gui(node, msg);
				if (psnSelected === undefined) {
					psn = "none";
					clear_gui(node, msg);
				}
				node.context().flow.set("stopPopulate", true);
				let label = "Sensor id: " + psnSelected;

				let msgToLabel = {
					payload: label,
				};

				sendToOutput(node, 32, msgToLabel.payload);
			}
		} catch {}
	}

	//~PROGRAM~

	async function program_sensor(node, msg) {
		if (msg.topic === "begin_programming") {
			try {
				var psnSelected = node.context().flow.get("psnSelected");
				var programmingMode = node.context().flow.get("programmingMode") || false;
				var lastReadPsn = node.context().flow.get("lastReadPsn") || [];
			} catch {}
			if (lastReadPsn.length > 0) {
				// Get the 'psn' value of the current element
				var currentPsn = lastReadPsn[0].psn;
				if (currentPsn === psnSelected) {
					// You can now use the 'currentPsn' variable as needed

					// Check if the 'read' value of the current element is true
					if (lastReadPsn[0].read === true) {
						// Do something if the 'read' value is true
					}

					if (!programmingMode) {
						let newmsg0 = {
							topic: "switch_programming_mode",
							payload: true,
						};

						if (previousValueProg !== true) {
							enterProgramingMode(node, newmsg0);

							while (node.context().flow.get("canQuery") !== true) {
								await delay(1000); // Check every 100ms
							}

							programmingMode = true;
							node.context().flow.set("programmingMode", programmingMode);
						}
					}
					try {
						var sys_cnf = node.context().flow.get("sys_cnf");
						var alm_cnf = node.context().flow.get("alm_cnf");
						var io_fltr = node.context().flow.get("io_fltr");

						var snsr_ena = node.context().flow.get("enable_sensor");
						var io1_mntc = node.context().flow.get("allow_maint_mode_io1");
						var io2_mntc = node.context().flow.get("allow_maint_mode_io2");
						var avg_val_evt = node.context().flow.get("instant_average_val");
					} catch {}
					var temp_c_bcd = false;
					var temp_k_bin = false;

					if (node.context().flow.get("kelvin_celsius_select") === false) {
						temp_c_bcd = true;
						temp_k_bin = false;
					} else {
						temp_c_bcd = node.context().flow.get("kelvin_celsius_select");
						temp_k_bin = true;
					}
					try {
						var led_temp_alm = node.context().flow.get("temp_led_blink");
						var led_rh_alm = node.context().flow.get("humidity_led_blink");
						var led_io_alm = node.context().flow.get("io_led_blink");
						var io_temp_alm = node.context().flow.get("temp_io_event");
						var io_rh_alm = node.context().flow.get("humidity_io_event");
						var io_io_alm = node.context().flow.get("io_event_alarm");
						var io_fltr = node.context().flow.get("io_filter");
						var temp_cal_ofset = node.context().flow.get("temp_cal");
						var ins_int = node.context().flow.get("inst_threshold");
						var alm_min = node.context().flow.get("almt_set_min");
						var almt_set_max = node.context().flow.get("almt_set_max");
						var avg_int = node.context().flow.get("avg_threshold");
						var alm_min = node.context().flow.get("almt_set_min");
						var max_rh_th = node.context().flow.get("almh_set_max");
						var min_rh_th = node.context().flow.get("almh_set_min");
						var max_io1_th_thresh = node.context().flow.get("max_io1_th_threshold");
						var min_io1_th_thresh = node.context().flow.get("min_io1_th_threshold");
						var max_io2_th_thresh = node.context().flow.get("max_io2_th_threshold");
						var min_io2_th_thresh = node.context().flow.get("min_io2_th_threshold");
						var min_maint_interval = node.context().flow.get("min_maintenance_interval");
						var max_maint_interval = node.context().flow.get("max_maintenance_interval");

						// var sensor_cure_heating_intensity = node.context().flow.get("cure_sensor_intensity");
					} catch {}

					triggerSpinner(node, true);
					// setting the we are writing flag
					node.context().flow.set("full_parameter_write", true);

					if (node.context().flow.get("full_parameter_write") === true) {
						//send sensor config commands
						msg.topic = "programing sensor";
						msg.options = "none";

						msg.payload = {
							psn: psnSelected,
							type: "sysset",
							action: 3,
							sys_cnf: sys_cnf,
							alm_cnf: alm_cnf,
							io_fltr: io_fltr,
							snsr_ena: snsr_ena,
							io1_mntc: io1_mntc,
							io2_mntc: io2_mntc,
							avg_val_evt: avg_val_evt,
							temp_k_bin: temp_k_bin,
							led_temp_alm: led_temp_alm,
							led_rh_alm: led_rh_alm,
							led_io_alm: led_io_alm,
							io_temp_alm: io_temp_alm,
							io_rh_alm: io_rh_alm,
							io_io_alm: io_io_alm,
						};

						await delay(500);
						setTimeout(() => {
							sendToOutput2(node, 0, msg.topic, msg.payload, msg.options);
						}, 500);

						await delay(500);

						msg.payload = {
							psn: psnSelected,
							type: "tmpcal",
							action: 3,
							temp_cal_ofst: temp_cal_ofset,
						};
						setTimeout(() => {
							sendToOutput(node, 0, msg.payload);
						}, 500);

						await delay(500);

						msg.payload = {
							psn: psnSelected,
							type: "instset",
							action: 3,
							ins_int: ins_int,
						};
						setTimeout(() => {
							sendToOutput(node, 0, msg.payload);
						}, 500);

						await delay(500);
						msg.payload = {
							psn: psnSelected,
							type: "avrset",
							action: 3,
							avg_int: avg_int,
						};
						setTimeout(() => {
							sendToOutput(node, 0, msg.payload);
						}, 500);

						await delay(500);
						msg.payload = {
							psn: psnSelected,
							type: "almtsetmax",
							action: 3,
							max_temp_th: almt_set_max,
						};
						setTimeout(() => {
							sendToOutput(node, 0, msg.payload);
						}, 500);

						await delay(500);
						msg.payload = {
							psn: psnSelected,
							type: "almtsetmin",
							action: 3,
							min_temp_th: alm_min,
						};
						setTimeout(() => {
							sendToOutput(node, 0, msg.payload);
						}, 500);

						await delay(500);
						msg.payload = {
							psn: psnSelected,
							type: "almhsetmax",
							action: 3,
							max_rh_th: max_rh_th,
						};
						setTimeout(() => {
							sendToOutput(node, 0, msg.payload);
						}, 500);

						await delay(500);
						msg.payload = {
							psn: psnSelected,
							type: "almhsetmin",
							action: 3,
							min_rh_th: min_rh_th,
						};
						setTimeout(() => {
							sendToOutput(node, 0, msg.payload);
						}, 500);
						await delay(500);
						msg.payload = {
							psn: psnSelected,
							type: "almio1set",
							action: 3,
							max_io1_th: max_io1_th_thresh,
							min_io1_th: min_io1_th_thresh,
						};
						setTimeout(() => {
							sendToOutput(node, 0, msg.payload);
						}, 500);

						await delay(500);
						msg.payload = {
							psn: psnSelected,
							type: "almio2set",
							action: 3,
							max_io2_th: max_io2_th_thresh,
							min_io2_th: min_io2_th_thresh,
						};
						setTimeout(() => {
							sendToOutput(node, 0, msg.payload);
						}, 500);

						await delay(500);
						msg.payload = {
							psn: psnSelected,
							type: "maintset",
							action: 3,
							max_mntc: max_maint_interval,
							min_mntc: min_maint_interval,
						};
						setTimeout(() => {
							sendToOutput(node, 0, msg.payload);
						}, 500);

						await delay(500);
						//exiting programming mode
						let newmsg0 = {
							topic: "switch_programming_mode",
							payload: false,
						};
						node.context().flow.set("full_parameter_write", false);

						setTimeout(() => {
							enterProgramingMode(node, newmsg0);
						}, 500);

						await delay(100);
						setTimeout(() => {
							triggerSpinner(node, false);
						}, 100);
					}
				} //can write if psn selected is psn read
			}
		}
	}

	function check_status_maintenance(node, msg) {
		var psnSelected = "";

		try {
			var psnSelected = node.context().flow.get("psnSelected");
		} catch {}

		try {
			var type = msg.payload.type;
		} catch {}

		if (psnSelected !== undefined && psnSelected !== "") {
			if (type === "sysstat" && msg.payload.snsr_mtnc === true) {
				triggerSpinnerMaintenance(node, true);
			} else {
				triggerSpinnerMaintenance(node, false);
			}
		}
	}

	function check_status_sensor_cure(node, msg) {
		var psnSelected = "";

		try {
			psnSelected = node.context().flow.get("psnSelected");
		} catch {}
		try {
			var action = msg.payload.action;
		} catch {}
		try {
			var type = msg.payload.type;
		} catch {}
		try {
			var inst = msg.payload.heat_intst;
		} catch {}
		try {
			var mtnc = msg.payload.snsr_mtnc;
			var act = msg.payload.heat_act;
		} catch {}

		// if (psnSelected !== undefined && psnSelected !== "") {
		if (type === "sensorcure" && action === 4 && inst === 0) {
			triggerSpinnerCure(node, true);
			triggerSpinnerMaintenance(node, true);
		} else {
			triggerSpinnerMaintenance(node, false);
			triggerSpinnerCure(node, false);
		}
		// }

		// if (psnSelected !== undefined && psnSelected !== "") {
		if (msg.payload.type === "sysstat" && mtnc === true && act === true) {
			triggerSpinnerCure(node, true);
			triggerSpinnerMaintenance(node, true);
		} else {
			triggerSpinnerMaintenance(node, false);
			triggerSpinnerCure(node, false);
		}
		// }
	}

	async function activate_sensor_cure(node, msg) {
		if (msg.topic === "activate_sensor_cure") {
			try {
				var previousValueCure = node.context().flow.get("previousValueCure") || false;
				var programmingMode = node.context().flow.get("programmingMode") || false;
				var psnSelected = node.context().flow.get("psnSelected");
			} catch {}

			if (msg.payload == true) {
				let newmsg0 = {
					topic: "switch_programming_mode",
					payload: true,
				};
				enterProgramingMode(node, newmsg0);

				msg.payload = {
					psn: psnSelected,
					type: "sensorcure",
					action: 3,
					heat_intst: 15,
				};

				await delay(2000);
				setTimeout(() => {
					sendToOutput(node, 0, msg.payload);
				}, 4000);
			}
			// Store the current payload value as the previous value for future comparisons
			// node.context().flow.set("previousValueCure", msg.payload);
		}
	}

	function clear_gui(node, msg) {
		try {
			node.context().flow.set("sys_cnf", 0);
			node.context().flow.set("alm_cnf", 0);
			node.context().flow.set("io_fltr", 0);
			node.context().flow.set("enable_sensor", false);
			node.context().flow.set("allow_maint_mode_io1", false);
			node.context().flow.set("allow_maint_mode_io2", false);
			node.context().flow.set("instant_average_val", false);
			node.context().flow.set("kelvin_celsius_select", true);
			node.context().flow.set("temp_led_blink", false);
			node.context().flow.set("humidity_led_blink", false);
			node.context().flow.set("io_led_blink", false);
			node.context().flow.set("temp_io_event", false);
			node.context().flow.set("humidity_io_event", false);
			node.context().flow.set("io_event_alarm", false);
			node.context().flow.set("io_filter", 0);
			node.context().flow.set("temp_cal", 0);
			node.context().flow.set("inst_threshold", 0);
			node.context().flow.set("avg_threshold", 0);
			node.context().flow.set("almt_set_max", 0);
			node.context().flow.set("almt_set_min", 0);
			node.context().flow.set("almh_set_max", 0);
			node.context().flow.set("almh_set_min", 0);
			node.context().flow.set("max_io1_th_threshold", 0);
			node.context().flow.set("min_io1_th_threshold", 0);
			node.context().flow.set("max_io2_th_threshold", 0);
			node.context().flow.set("min_io2_th_threshold", 0);
			node.context().flow.set("sensor_heat_max_power", false);
			node.context().flow.set("sensor_heat_min_power", false);
			node.context().flow.set("min_maintenance_interval", false);
			node.context().flow.set("max_maintenance_interval", false);
			node.context().flow.set("cure_sensor_intensity", 0);
		} catch {}
		for (let i = 11; i <= 27; i++) {
			if (i === 24 || i === 25) continue;
			sendToOutput(node, i, 0);
		}

		sendToOutput(node, 1, false);
		sendToOutput(node, 2, false);
		sendToOutput(node, 3, false);
		sendToOutput(node, 4, false);
		sendToOutput(node, 5, false);
		sendToOutput(node, 6, false);
		sendToOutput(node, 7, false);
		sendToOutput(node, 8, false);
		sendToOutput(node, 9, false);
		sendToOutput(node, 10, false);
		sendToOutput(node, 11, false);
		triggerSpinner(node, false);
		// let msgToLabel = {
		// 	payload: "none",
		// };

		// sendToOutput(node, 32, msgToLabel.payload);
	}

	function refresh_list_and_clear_vars(node, msg) {
		if (msg.topic === "refresh_list") {
			node.context().flow.set("sys_cnf", 0);
			node.context().flow.set("alm_cnf", 0);
			node.context().flow.set("io_fltr", 0);
			node.context().flow.set("enable_sensor", false);
			node.context().flow.set("allow_maint_mode_io1", false);
			node.context().flow.set("allow_maint_mode_io2", false);
			node.context().flow.set("instant_average_val", false);
			node.context().flow.set("kelvin_celsius_select", true);
			node.context().flow.set("temp_led_blink", false);
			node.context().flow.set("humidity_led_blink", false);
			node.context().flow.set("io_led_blink", false);
			node.context().flow.set("temp_io_event", false);
			node.context().flow.set("humidity_io_event", false);
			node.context().flow.set("io_event_alarm", false);
			node.context().flow.set("io_filter", 0);
			node.context().flow.set("temp_cal", 0);
			node.context().flow.set("inst_threshold", 0);
			node.context().flow.set("avg_threshold", 0);
			node.context().flow.set("almt_set_max", 0);
			node.context().flow.set("almt_set_min", 0);
			node.context().flow.set("almh_set_max", 0);
			node.context().flow.set("almh_set_min", 0);
			node.context().flow.set("max_io1_th_threshold", 0);
			node.context().flow.set("min_io1_th_threshold", 0);
			node.context().flow.set("max_io2_th_threshold", 0);
			node.context().flow.set("min_io2_th_threshold", 0);
			node.context().flow.set("sensor_heat_max_power", false);
			node.context().flow.set("sensor_heat_min_power", false);
			node.context().flow.set("min_maintenance_interval", false);
			node.context().flow.set("max_maintenance_interval", false);
			node.context().flow.set("cure_sensor_intensity", 0);
			node.context().flow.set("reset_list", true);
			node.context().flow.set("psnArray", []);
			node.context().flow.set("optionsList", "");
			node.context().flow.set("canQuery", false);
			node.context().flow.set("currentPsn", "");
			node.context().flow.set("psnSelected", "");
			node.context().flow.set("lastReadPsn", []);
			node.context().flow.set("stopPopulate", false);
			node.context().flow.set("monitor_prog_mode", false);

			let newmsg0 = {
				topic: "switch_programming_mode",
				payload: false,
			};

			msg.payload = {
				type: "prog",
				action: 1,
			};
			sendToOutput(node, 0, msg.payload);

			enterProgramingMode(node, newmsg0);
			//set switches to false
		} else {
		}
	}

	RED.nodes.registerType("g4nrht-dashboard", sensorRead, {
		// Define the node's configuration properties
		defaults: {
			name: { value: "", required: true },
		},
	});
};
