module.exports = function(RED) {
	'use strict'

	function rhtDecode(config) {
		RED.nodes.createNode(this, config);
		var node = this;
		node.rules = config.rules || [];
		node.on('input', function(msg, send, done) {
			if (msg && msg.payload && msg.payload.canid) {
				let res = decodeCanFrame(node, msg);
				if (res && node.rules instanceof Array && node.rules.length) {
					let out = new Array(node.rules).fill(null);
					for (let i=0; i<node.rules.length; i++) {
						let r = node.rules[i];
						if ((res.psn && r.psn && res.psn == r.psn) || r.psn == 'FFFFFFFF') {
							let cond = (res.type == 'insth' && ['ins_temp', 'ins_rh'].indexOf(r.metric) >= 0)
								|| (res.type == 'insio' && ['ins_io1', 'ins_io2'].indexOf(r.metric) >= 0)
								|| (res.type == 'avrth' && ['avg_temp', 'avg_rh'].indexOf(r.metric) >= 0)
								|| (res.type == 'almt' && r.metric == 'alm_temp')
								|| (res.type == 'almh' && r.metric == 'alm_rh')
								|| (res.type == 'almio' && ['alm_io1', 'alm_io2'].indexOf(r.metric) >= 0);
							if (cond) {
								out[i] = { payload: res[r.metric] };
							} else if (r.metric == 'msg') {
								out[i] = { payload: res };
							}
						}
					}
					if (out.find(v => v instanceof Object)) {
						node.send(out);
					}
				} else if (res) {
					node.send({ payload: res });
				}
			}
			if (done) done();
		});
	}

	RED.nodes.registerType('g4n03rht-decode', rhtDecode, {
		// define the node's configuration properties
		defaults: {
            name: {value: 'g4n03rht decode', required: true},
            rules: {value: [{ psn: 'FFFFFFFF', metric: 'msg', }], required: true},
            outputs: {value:1}
		}
	});

	function rhtEncode(config) {
		RED.nodes.createNode(this, config);
		var node = this;
		node.on('input', function(msg, send, done) {
			if (msg && msg.payload && msg.payload.type && msg.payload.action != null) {
				msg.payload = encodeCanFrame(node, msg);
			}
			if (done) done();
	
		});
	}

	RED.nodes.registerType('g4n03rht-encode', rhtEncode, {
		// define the node's configuration properties
		defaults: {
			name: {value: 'g4n03rht encode', required: true},
		}
	});

	// decode socketcan frames to rht messages
	function decodeCanFrame(node, msg) {
		let res;
		if (msg.payload.canid == 0x18ff8100) {
			// INSTH instantaneous temperature and humidity message
			res = {
				canid: msg.payload.canid,
				epoch: Math.floor(msg.payload.timestamp/1000),
				type: 'insth'
			};
			if (msg.payload.data && msg.payload.data.length == 8) {
				res.psn = decodePsn(node, msg);
				res.ins_temp = (msg.payload.data[4]*256 + msg.payload.data[5])/100 - 273.15;
				res.ins_temp = res.ins_temp.toFixed(2) * 1;
				res.ins_rh = (msg.payload.data[6]*100 + msg.payload.data[7])/100;
			}
		} else if (msg.payload.canid == 0x18ff8200) {
			// AVRTH average temperature and humidity message
			res = {
				canid: msg.payload.canid,
				epoch: Math.floor(msg.payload.timestamp/1000),
				type: 'avrth'
			};
			if (msg.payload.data && msg.payload.data.length == 8) {
				res.psn = decodePsn(node, msg);
				res.avg_temp = (msg.payload.data[4]*256 + msg.payload.data[5])/100 - 273.15;
				res.avg_temp = res.avg_temp.toFixed(2) * 1;
				res.avg_rh = (msg.payload.data[6]*100 + msg.payload.data[7])/100;
			}
		} else if ((msg.payload.canid >> 8) == 0x18ff83) {
			// INSIO instantaneous voltage reading of analog inputs
			res = {
				canid: msg.payload.canid,
				epoch: Math.floor(msg.payload.timestamp/1000),
				type: 'insio'
			};
			if (msg.payload.data && msg.payload.data.length == 8) {
				res.psn = decodePsn(node, msg);
				res.ins_io1 = msg.payload.data[4];
				res.ins_io2 = msg.payload.data[5];
			}
		} else if ((msg.payload.canid >> 8) == 0x18ff84) {
			// ALMT temperature alarm message
			res = {
				epoch: Math.floor(msg.payload.timestamp/1000),
				action: (msg.payload.canid & 0x000000ff),
				type: 'almt'
			};
			if (msg.payload.data && msg.payload.data.length == 8) {
				res.psn = decodePsn(node, msg);
				res.alm_temp = (msg.payload.data[4]*256 + msg.payload.data[5])/100 - 273.15;
				res.alm_temp = res.alm_temp.toFixed(2) * 1;
				let temp_th = (msg.payload.data[6]*256 + msg.payload.data[7])/100 - 273.15;
				if (res.action == 0x10) {
					res.max_temp_ovr_th = temp_th.toFixed(2) * 1;
				} else if (res.action == 0x11) {
					res.max_temp_und_th = temp_th.toFixed(2) * 1
				} else if (res.action == 0x12) {
					res.min_temp_und_th = temp_th.toFixed(2) * 1
				} else if (res.action == 0x13) {
					res.min_temp_ovr_th = temp_th.toFixed(2) * 1
				}
			}
		} else if ((msg.payload.canid >> 8) == 0x18ff85) {
			// ALMH humidity alarm message
			res = {
				canid: msg.payload.canid,
				epoch: Math.floor(msg.payload.timestamp/1000),
				action: (msg.payload.canid & 0x000000ff),
				type: 'almh'
			};
			if (msg.payload.data && msg.payload.data.length == 8) {
				res.psn = decodePsn(node, msg);
				res.alm_rh = (msg.payload.data[4]*100 + msg.payload.data[5])/100;
				let rh_th = (msg.payload.data[6]*100 + msg.payload.data[7])/100;
				if (res.action == 0x20) {
					res.max_rh_ovr_th = rh_th;
				} else if (res.action == 0x21) {
					res.max_rh_und_th = rh_th;
				} else if (res.action == 0x22) {
					res.min_rh_und_th = rh_th;
				} else if (res.action == 0x23) {
					res.min_rh_ovr_th = rh_th;
				}
			}
		} else if ((msg.payload.canid >> 8) == 0x18ff86) {
			// ALMIO IO alarm message
			res = {
				candid: msg.payload.canid,
				epoch: Math.floor(msg.payload.timestamp/1000),
				action: (msg.payload.canid & 0x000000ff),
				type: 'almio'
			};
			if (msg.payload.data && msg.payload.data.length == 8) {
				res.psn = decodePsn(node, msg);
				res.alm_io1 = msg.payload.data[4];
				res.alm_io2 = msg.payload.data[5];
				let io1_th = msg.payload.data[6];
				let io2_th = msg.payload.data[7];
				if (res.action == 0x30) {
					res.max_io1_ovr_th = io1_th;
				} else if (res.action == 0x31) {
					res.max_io1_und_th = io1_th;
				} else if (res.action == 0x32) {
					res.min_io1_und_th = io1_th;
				} else if (res.action == 0x33) {
					res.min_io1_ovr_th = io1_th;
				} else if (res.action == 0x34) {
					res.max_io2_ovr_th = io2_th;
				} else if (res.action == 0x35) {
					res.max_io2_und_th = io2_th;
				} else if (res.action == 0x36) {
					res.min_io2_und_th = io2_th;
				} else if (res.action == 0x37) {
					res.min_io2_ovr_th = io2_th;
				}
			}
		} else if ((msg.payload.canid >> 8) == 0x18ff87) {
			// SYSEVN system event report
			res = {
				canid: msg.payload.canid,
				epoch: Math.floor(msg.payload.timestamp/1000),
				action: (msg.payload.canid & 0x000000ff),
				type: 'sysevn'
			};
			if (msg.payload.data && msg.payload.data.length == 8) {
				res.psn = decodePsn(node, msg);
				res.sys_cnf = msg.payload.data[4];
				res.alm_cnf = msg.payload.data[5];
				res.io_fltr = (msg.payload.data[6]*256 + msg.payload.data[7])*0.75;
				// trigger source flags
				if (res.action == 0x40) {
					res.rst_pwr_evt = true;
				} else if (res.action == 0x41) {
					res.prog_mode = true;
				} else if (res.action == 0x42) {
					res.prog_mode = false;
				} else if (res.action == 0x43) {
					res.mtnc_mode = true;
				} else if (res.action == 0x44) {
					res.mtnc_mode = false;
				}
				// system config flags
				res.snsr_ena = ((res.sys_cnf & 0x80) >> 7 == 0) ? true : false;
				res.io1_mntc = ((res.sys_cnf & 0x40) >> 6 == 1) ? true : false;
				res.io2_mntc = ((res.sys_cnf & 0x20) >> 5 == 1) ? true : false;
				res.avg_val_evt = ((res.sys_cnf & 0x10) >> 4 == 1) ? true : false;
				if (res.sys_cnf & 0x3 == 1) {
					res.temp_c_bcd = true;
					res.temp_k_bin = false;
				} else {
					res.temp_c_bcd = false;
					res.temp_k_bin = true;
				}
				// alarm config flags
				res.led_temp_alm = ((res.alm_cnf & 0x20) >> 5 == 1) ? true : false;
				res.led_rh_alm = ((res.alm_cnf & 0x10) >> 4 == 1) ? true : false;
				res.led_io_alm = ((res.alm_cnf & 0x8) >> 3 == 1) ? true : false;
				res.io_temp_alm = ((res.alm_cnf & 0x4) >> 2 == 1) ? true : false;
				res.io_rh_alm = ((res.alm_cnf & 0x2) >> 1 == 1) ? true : false;
				res.io_io_alm = (res.alm_cnf & 0x1 == 1) ? true : false;
			}
		} else if ((msg.payload.canid >> 8) == 0x18ff88) {
			// SYSSTAT system status
			res = {
				canid: msg.payload.canid,
				epoch: Math.floor(msg.payload.timestamp/1000),
				type: 'sysstat'
			};
			if (msg.payload.data && msg.payload.data.length == 8) {
				res.psn = decodePsn(node, msg);
				res.sys_stat = msg.payload.data[4]*256 + msg.payload.data[5];
				res.ovr_max_temp_ovr_th = ((res.sys_stat & 0x8000) >> 15) ? true : false;
				res.und_min_temp_th = ((res.sys_stat & 0x4000) >> 14) ? true : false;
				res.ovr_max_rh_th = ((res.sys_stat & 0x2000) >> 13) ? true : false;
				res.und_min_rh_th = ((res.sys_stat & 0x1000) >> 12) ? true : false;
				res.ovr_max_io1_th = ((res.sys_stat & 0x800) >> 11) ? true : false;
				res.und_min_io1_th = ((res.sys_stat & 0x400) >> 10) ? true : false;
				res.ovr_max_io2_th = ((res.sys_stat & 0x200) >> 9) ? true : false;
				res.und_min_io2_th = ((res.sys_stat & 0x100) >> 8) ? true : false;
				res.snsr_act = ((res.sys_stat & 0x80) >> 7) ? true : false;
				res.alm_ind_led = ((res.sys_stat & 0x40) >> 6) ? true : false;
				res.heat_act = ((res.sys_stat & 0x20) >> 5) ? true : false;
				res.alm_ind_io = ((res.sys_stat & 0x10) >> 4) ? true : false;
				res.snsr_mtnc = ((res.sys_stat & 0x8) >> 3) ? true : false;
				res.snsr_prog = ((res.sys_stat & 0x4) >> 2) ? true : false;
			}
		} else if ((msg.payload.canid >> 8) == 0x18ffc0) {
			// WKU, SLP, KEEPALIVE, IMALIVE
			res = {
				canid: msg.payload.canid,
				epoch: Math.floor(msg.payload.timestamp/1000),
				action: (msg.payload.canid & 0x000000ff),
				type: 'prog'
			};
			if (msg.payload.data && msg.payload.data.length == 8) {
				res.psn = decodePsn(node, msg);
				if (res.action == 0x00) {
					res.wku = true;
				} else if (res.action == 0x01) {
					res.slp = true;
				} else if (res.action == 0xf0) {
					res.keepalive = true;
				} else if (res.action == 0xf1) {
					res.imalive = true;
				}
				res.data = msg.payload.data.slice(4);
			}
		} else if ((msg.payload.canid >> 8) == 0x18ffc1) {
			// SYSSET system settings
			res = {
				canid: msg.payload.canid,
				epoch: Math.floor(msg.payload.timestamp/1000),
				action: (msg.payload.canid & 0x000000ff),
				type: 'sysset',
			};
			if (msg.payload.data && msg.payload.data.length == 8) {
				res.psn = decodePsn(node, msg);
				if (res.action > 1 && res.action < 5) {
					res.sys_cnf = msg.payload.data[4];
					res.alm_cnf = msg.payload.data[5];
					res.io_fltr = (msg.payload.data[6]*256 + msg.payload.data[7]*0.75);
					// system config flags
					res.snsr_ena = ((res.sys_cnf & 0x80) >> 7 == 0) ? true : false;
					res.io1_mntc = ((res.sys_cnf & 0x40) >> 6 == 1) ? true : false;
					res.io2_mntc = ((res.sys_cnf & 0x20) >> 5 == 1) ? true : false;
					res.avg_val_evt = ((res.sys_cnf & 0x10) >> 4 == 1) ? true : false;
					if ((res.sys_cnf & 0x3) == 1) {
						res.temp_c_bcd = true;
						res.temp_k_bin = false;
					} else {
						res.temp_c_bcd = false;
						res.temp_k_bin = true;
					}            
					// alarm config flags
					res.led_temp_alm = ((res.alm_cnf & 0x20) >> 5 == 1) ? true : false;
					res.led_rh_alm = ((res.alm_cnf & 0x10) >> 4 == 1) ? true : false;
					res.led_io_alm = ((res.alm_cnf & 0x8) >> 3 == 1) ? true : false;
					res.io_temp_alm = ((res.alm_cnf & 0x4) >> 2 == 1) ? true : false;
					res.io_rh_alm = ((res.alm_cnf & 0x2) >> 1 == 1) ? true : false;
					res.io_io_alm = (res.alm_cnf & 0x1 == 1) ? true : false;
				}
			}
		} else if ((msg.payload.canid >> 8) == 0x18ffc2) {
			// TMPCAL temperature calibration
			res = {
				canid: msg.payload.canid,
				epoch: Math.floor(msg.payload.timestamp/1000),
				action: (msg.payload.canid & 0x000000f),
				type: 'tmpcal'
			};
			if (msg.payload.data && msg.payload.data.length == 8) {
				res.psn = decodePsn(node, msg);
				if (res.action > 1 && res.action < 5) {
					let cal_ofst = msg.payload.data[4]*256 + msg.payload.data[5];
					if (cal_ofst >> 15 == 0) {
						// positive values
						res.temp_cal_ofst = cal_ofst/100;
						
					} else if (cal_ofst >> 15 == 1) {
						// negative values
						res.temp_cal_ofst = (cal_ofst- 0xffff)/100;
					}
				}
			}
		} else if ((msg.payload.canid >> 8) == 0x18ffc3) {
			// INSTSET instantaneous temperature and humidity time interval
			res = {
				canid: msg.payload.canid,
				epoch: Math.floor(msg.payload.timestamp/1000),
				action: (msg.payload.canid & 0x000000ff),
				type: 'instset'
			};
			if (msg.payload.data && msg.payload.data.length == 8) {
				res.psn = decodePsn(node, msg);
				if (res.action > 1 && res.action < 5) {
					res.ins_int = (msg.payload.data[4]*256 + msg.payload.data[5])/4;
				}
			}
			
		} else if ((msg.payload.canid >> 8) == 0x18ffc4) {
			// AVRSET average temperature and humidity time interval
			res = {
				canid: msg.payload.canid,
				epoch: Math.floor(msg.payload.timestamp/1000),
				action: (msg.payload.canid & 0x000000ff),
				type: 'avrset'
			};
			if (msg.payload.data && msg.payload.data.length == 8) {
				res.psn = decodePsn(node, msg);
				if (res.action > 1 && res.action < 5) {
					res.avg_int = (msg.payload.data[4]*256 + msg.payload.data[5])*10;
				}
			}
		} else if ((msg.payload.canid >> 8) == 0x18ffc5) {
			// ALMTSETMAX set maximum termparature event threshold
			res = {
				canid: msg.payload.canid,
				epoch: Math.floor(msg.payload.timestamp/1000),
				action: (msg.payload.canid & 0x000000ff),
				type: 'almtsetmax'
			};
			if (msg.payload.data && msg.payload.data.length == 8) {
				res.psn = decodePsn(node, msg);
				if (res.action > 1 && res.action < 5) {
					res.max_temp = (msg.payload.data[4]*256 + msg.payload.data[5])/100 - 273.15;
				}
			}
		} else if ((msg.payload.canid >> 8) == 0x18ffc6) {
			// ALMTSETMIN set maximum termparature event threshold
			res = {
				canid: msg.payload.canid,
				epoch: Math.floor(msg.payload.timestamp/1000),
				action: (msg.payload.canid & 0x000000ff),
				type: 'almtsetmin'
			};
			if (msg.payload.data && msg.payload.data.length == 8) {
				res.psn = decodePsn(node, msg);
				if (res.action > 1 && res.action < 5) {
					res.min_temp = (msg.payload.data[4]*256 + msg.payload.data[5])/100 - 273.15;
				}
			}
		} else if ((msg.payload.canid >> 8) == 0x18ffc7) {
			// ALMHSETMAX set maximum humidity event threshold
			res = {
				canid: msg.payload.canid,
				epoch: Math.floor(msg.payload.timestamp/1000),
				action: (msg.payload.canid & 0x000000ff),
				type: 'almhsetmax'
			};
			if (msg.payload.data && msg.payload.data.length == 8) {
				res.psn = decodePsn(node, msg);
				if (res.action > 1 && res.action < 5) {
					res.max_rh = (msg.payload.data[4]*100 + msg.payload.data[5])/100;
				}
			}
		} else if ((msg.payload.canid >> 8) == 0x18ffc8) {
			// ALMHSETMIN set minimum humidity event threshold
			res = {
				canid: msg.payload.canid,
				epoch: Math.floor(msg.payload.timestamp/1000),
				action: (msg.payload.canid & 0x000000ff),
				type: 'almhsetmin'
			};
			if (msg.payload.data && msg.payload.data.length == 8) {
				res.psn = decodePsn(node, msg);
				if (res.action > 1 && res.action < 5) {
					res.min_rh = (msg.payload.data[4]*100 + msg.payload.data[5])/100;
				}
			}
		} else if ((msg.payload.canid >> 8) == 0x18ffc9) {
			// ALMIO1SET set maximum and minimum humidity event threshold
			res = {
				canid: msg.payload.canid,
				epoch: Math.floor(msg.payload.timestamp/1000),
				action: (msg.payload.canid & 0x000000ff),
				type: 'almio1set'
			};
			if (msg.payload.data && msg.payload.data.length == 8) {
				res.psn = decodePsn(node, msg);
				if (res.action > 1 && res.action < 5) {
					res.max_io1 = msg.payload.data[4];
					res.min_io1 = msg.payload.data[5];
				}
			}
		} else if ((msg.payload.canid >> 8) == 0x18ffca) {
			// ALMIO2SET set maximum and minimum humidity event threshold
			res = {
				canid: msg.payload.canid,
				epoch: Math.floor(msg.payload.timestamp/1000),
				action: (msg.payload.canid & 0x000000ff),
				type: 'almio2set'
			};
			if (msg.payload.data && msg.payload.data.length == 8) {
				res.psn = decodePsn(node, msg);
				if (res.action > 1 && res.action < 5) {
					res.max_io2 = msg.payload.data[4];
					res.min_io2 = msg.payload.data[5];
				}
			}
		} else if ((msg.payload.canid >> 8) == 0x18ffcb) {
			// SENSORCURE sensor cure
			res = {
				canid: msg.payload.canid,
				epoch: Math.floor(msg.payload.timestamp/1000),
				action: (msg.payload.canid & 0x000000ff),
				type: 'sensorcure'
			};
			if (msg.payload.data && msg.payload.data.length == 8) {
				res.psn = decodePsn(node, msg);
				if (res.action > 1 && res.action < 5) {
					res.heat_intst = msg.payload.data[7];
				}
			}
		} else if ((msg.payload.canid >> 8) == 0x18ffcc) {
			// MAINTSET set maximum and minimum maintenance mode voltage trigger threshold
			res = {
				canid: msg.payload.canid,
				epoch: Math.floor(msg.payload.timestamp/1000),
				action: (msg.payload.canid & 0x000000ff),
				type: 'maintset'
			};
			if (msg.payload.data && msg.payload.data.length == 8) {
				res.psn = decodePsn(node, msg);
				if (res.action > 1 && res.action < 5) {
					res.max_io2 = msg.payload.data[4]
					res.min_io2 = msg.payload.data[5];
				}
			}
		}
		// send rht message
		if (res) return res;
	}

	// decode device PSN from byte array
	function decodePsn(node, msg) {
		if (msg && msg.payload && msg.payload.data && msg.payload.data.length >= 4) {
			let psn = (
				('0' + msg.payload.data[0].toString(16)).slice(-2)+
				('0' + msg.payload.data[1].toString(16)).slice(-2)+
				('0' + msg.payload.data[2].toString(16)).slice(-2)+
				('0' + msg.payload.data[3].toString(16)).slice(-2)
			).toUpperCase();
			let context = node.context();
			let psnList = context.get('psnList');
			if (psnList instanceof Array) {
				if (psnList.indexOf(psn) < 0) {
					// add psn to psnList
					psnList.push(psn);
					context.set('psnList', psnList)
				}
			}
			else {
				psnList = [psn];
				context.set('psnList', psnList)
			}
			return psn;
		}                 
	}

	// encode rht messages to socketcan frames
	function encodeCanFrame(node, msg) {
		let res;
		let canid = parseInt(msg.payload.canid, 16);
		let context = node.context();
		if (canid == 0x18ffc000 || (msg.payload.type == 'prog' && msg.payload.action == 0)) {
			// WKU: enter programming mode
			res = {
				canid: msg.payload.canid || '0x18ffc000',
				canfd: false,
				ext: true,
				rtr: false,
				data: [255, 255, 255, 255, 55, 88, 231, 240]
			};
			context.set('last', { payload: res });
			context.set('pass', true);
			// resend WKU command every second for 10 seconds
			context.set('timeout', setTimeout(() => context.set('pass', false), 10000));
			context.set('interval', setInterval(function () {
				let last = context.get('last');
				if (context.get('pass') && last) {
					if (last.count) {
						last.count++;
					} else {
						last.count = 1;
					}
					node.send(last);
					context.set('last', last);
				}
				else {
					clearTimeout(context.get('timeout'));
					clearInterval(context.get('interval'));
				}
			}, 1000));
		} else if (canid == 0x18ffc001 || (msg.payload.type == 'prog' && msg.payload.action == 1)) {
			// SLP: exit programming mode
			res = {
				canid: msg.payload.canid || '0x18ffc001',
				canfd: false,
				ext: true,
				rtr: false,
				data: [255, 255, 255, 255, 55, 88, 231, 240]
			};
		} else if (canid == 0x18ffc0f0 || (msg.payload.type == 'prog' && msg.payload.action == 240)) {
			// KEEPALIVE: stop sending WKU
			clearTimeout(context.get('timeout'));
			clearInterval(context.get('interval'));
			context.set('last', undefined);
			context.set('pass', true);
		} else if (msg.payload.psn && (canid == 0x18ffc101 || (msg.payload.type == 'sysset' && msg.payload.action == 1))) {
			// SYSSET: system settings, query
			let data = Array.from(Buffer.from(msg.payload.psn, 'hex')).concat(Array(4).fill(0));
			res = {
				canid: msg.payload.canid || '0x18ffc101',
				canfd: false,
				ext: true,
				rtr: false,
				data: data,
			};
		} else if (((canid == 0x18ffc103 || (msg.payload.type == 'sysset' && msg.payload.action == 3))
			&& msg.payload.psn && msg.payload.psn.length == 8 && msg.payload.sys_cnf != null
			&& msg.payload.alm_cnf != null && msg.payload.io_fltr != null)) {
			// SYSSET: system settings, program
			let data = Array.from(Buffer.from(msg.payload.psn, 'hex'));
			// set system config flags
			if (msg.payload.snsr_ena == true) {
				msg.payload.sys_cnf &= 0x7f;
			} else if (msg.payload.snsr_ena == false) {
				msg.payload.sys_cnf |= 0x80;
			}
			if (msg.payload.io1_mntc == true) {
				msg.payload.sys_cnf |= 0x40;
			} else if (msg.payload.io1_mntc == false) {
				msg.payload.sys_cnf &= 0xbf;
			}
			if (msg.payload.io2_mntc == true) {
				msg.payload.sys_cnf |= 0x20;
			} else if (msg.payload.io2_mntc == false) {
				msg.payload.sys_cnf &= 0xdf;
			}
			if (msg.payload.avg_val_evt == true) {
				msg.payload.sys_cnf |= 0x10;
			} else if (msg.payload.avg_val_evt == false) {
				msg.payload.sys_cnf &= 0xef;
			}
			if (msg.payload.temp_k_bin == true) {
				msg.payload.sys_cnf &= 0xfc;
			} else if (msg.payload.temp_k_bin == false) {
				msg.payload.sys_cnf = (msg.payload.sys_cnf & 0xfc) | 0x01;
			}
			// set alarm config flags
			if (msg.payload.led_temp_alm == true) {
				msg.payload.alm_cnf |= 0x20;
			} else if (msg.payload.led_temp_alm == false) {
				msg.payload.alm_cnf &= 0xdf;
			}
			if (msg.payload.led_rh_alm == true) {
				msg.payload.alm_cnf |= 0x10;
			} else if (msg.payload.led_rh_alm == false) {
				msg.payload.alm_cnf &= 0xef;
			}
			if (msg.payload.led_io_alm == true) {
				msg.payload.alm_cnf |= 0x8;
			} else if (msg.payload.led_io_alm == false) {
				msg.payload.alm_cnf &= 0xf7;
			}
			if (msg.payload.io_temp_alm == true) {
				msg.payload.alm_cnf |= 0x4;
			} else if (msg.payload.io_temp_alm == false) {
				msg.payload.alm_cnf &= 0xfb;
			}
			if (msg.payload.io_rh_alm == true) {
				msg.payload.alm_cnf |= 0x2;
			} else if (msg.payload.io_rh_alm == false) {
				msg.payload.alm_cnf &= 0xfd;
			}
			if (msg.payload.io_io_alm == true) {
				msg.payload.alm_cnf |= 0x1;
			} else if (msg.payload.io_io_alm == false) {
				msg.payload.alm_cnf &= 0xfe;
			}
			// set io filter
			if (msg.payload.io_fltr) msg.payload.io_fltr = Math.round(msg.payload.io_fltr/0.75);
			let xpar = [
				('00'+(msg.payload.sys_cnf).toString(16)).slice(-2),
				('00'+(msg.payload.alm_cnf).toString(16)).slice(-2),
				('0000'+(msg.payload.io_fltr).toString(16)).slice(-4)
			].join('');
			data = data.concat(Array.from(Buffer.from(xpar, 'hex')));
			res = {
				canid: msg.payload.canid || '0x18ffc103',
				canfd: false,
				ext: true,
				rtr: false,
				data: data,
			};
		} else if ((canid == 0x18ffc201 || (msg.payload.type == 'tmpcal' && msg.payload.action == 1))
			&& msg.payload.psn && msg.payload.psn.length == 8) {
			// TMPCAL: temperature calibration, query temp_cal_ofst
			let data = Array.from(Buffer.from(msg.payload.psn, 'hex')).concat(Array(4).fill(0));
			res = {
				canid: msg.payload.canid || '0x18ffc201',
				canfd: false,
				ext: true,
				rtr: false,
				data: data
			};
		} else if ((canid == 0x18ffc203 || (msg.payload.type == 'tmpcal' && msg.payload.action == 3))
			&& msg.payload.psn && msg.payload.psn.length == 8 && msg.payload.temp_cal_ofst != null) {
			// TMPCAL: temperature calibration, program temp_cal_ofst
			let data = Array.from(Buffer.from(msg.payload.psn, 'hex'));
			let xpar = '00000000';
			let cal_ofst = Math.round(msg.payload.temp_cal_ofst*100);
			if (msg.payload.temp_cal_ofst >= 0) {
				if (cal_ofst <= 32767) {
					xpar = ('0000'+(cal_ofst).toString(16)).slice(-4)+'0000';
				}
				else {
					// integer overflow
					xpar = '7fff0000';
				}
			} else if (cal_ofst < 0) {
				if (cal_ofst > -32768) {
					xpar = ('0000'+(0xffff + cal_ofst).toString(16)).slice(-4)+'0000';
				}
				else {
					// integer overflow
					xpar = '8fff0000';
				}
			}
			data = data.concat(Array.from(Buffer.from(xpar, 'hex')));
			res = {
				canid: msg.payload.canid || '0x18ffc203',
				canfd: false,
				ext: true,
				rtr: false,
				data: data
			};
		} else if ((canid == 0x18ffc301 || (msg.payload.type == 'instset' && msg.payload.action == 1))
			&& msg.payload.psn && msg.payload.psn.length == 8) {
			// INSTSET: instantaneous temperature and humidity time interval, query ins_int
			let data = Array.from(Buffer.from(msg.payload.psn, 'hex')).concat(Array(4).fill(0));
			res = {
				canid: msg.payload.canid || '0x18ffc301',
				canfd: false,
				ext: true,
				rtr: false,
				data: data
			};
		} else if ((canid == 0x18ffc303 || (msg.payload.type == 'instset' && msg.payload.action == 3))
			&& msg.payload.psn && msg.payload.psn.length == 8 && msg.payload.ins_int != null) {
			// INSTSET: instantaneous temperature and humidity time interval, program ins_int
			let data = Array.from(Buffer.from(msg.payload.psn, 'hex'));
			// set current interval: 250 ms/bit
			let ins_int = Math.round(msg.payload.ins_int*4);
			let xpar = ('0000'+(ins_int).toString(16)).slice(-4)+'0000';
			data = data.concat(Array.from(Buffer.from(xpar, 'hex')));
			res = {
				canid: msg.payload.canid || '0x18ffc303',
				canfd: false,
				ext: true,
				rtr: false,
				data: data
			};
		} else if ((canid == 0x18ffc401 || (msg.payload.type == 'avrset' && msg.payload.action == 1))
			&& msg.payload.psn && msg.payload.psn.length == 8) {
			// AVRSET: average temperature and humidity time interval, query avg_int
			let data = Array.from(Buffer.from(msg.payload.psn, 'hex')).concat(Array(4).fill(0));
			res = {
				canid: msg.payload.canid || '0x18ffc401',
				canfd: false,
				ext: true,
				rtr: false,
				data: data
			};
		} else if ((canid == 0x18ffc403 || (msg.payload.type == 'avrset' && msg.payload.action == 3))
			&& msg.payload.psn && msg.payload.psn.length == 8 && msg.payload.avg_int != null) {
			// AVRSET: average temperature and humidity time interval, program avg_int
			let data = Array.from(Buffer.from(msg.payload.psn, 'hex'));
			// set average interval: 10 sec/bit
			let avg_int = Math.round(msg.payload.avg_int/10);
			let xpar = ('0000'+(avg_int).toString(16)).slice(-4)+'0000';
			data = data.concat(Array.from(Buffer.from(xpar, 'hex')));
			res = {
				canid: msg.payload.canid || '0x18ffc403',
				canfd: false,
				ext: true,
				rtr: false,
				data: data
			};
		} else if ((canid == 0x18ffc501 || (msg.payload.type == 'almtsetmax' && msg.payload.action == 1))
			&& msg.payload.psn && msg.payload.psn.length == 8) {
			// ALMTSETMAX: maximum temperature event threshold, query max_temp
			let data = Array.from(Buffer.from(msg.payload.psn, 'hex')).concat(Array(4).fill(0));
			res = {
				canid: msg.payload.canid || '0x18ffc501',
				canfd: false,
				ext: true,
				rtr: false,
				data: data
			};
		} else if ((canid == 0x18ffc503 || (msg.payload.type == 'almtsetmax' && msg.payload.action == 3))
			&& msg.payload.psn && msg.payload.psn.length == 8 && msg.payload.max_temp != null) {
			// ALMTSETMAX: maximum temperature event threshold, program max_temp
			let data = Array.from(Buffer.from(msg.payload.psn, 'hex'));
			// set maximum temperature: (max_temp + 273.15)*100
			let max_temp = Math.round((msg.payload.max_temp + 273.15)*100);
			let xpar = ('0000'+(max_temp).toString(16)).slice(-4)+'0000';
			data = data.concat(Array.from(Buffer.from(xpar, 'hex')));
			res = {
				canid: msg.payload.canid || '0x18ffc503',
				canfd: false,
				ext: true,
				rtr: false,
				data: data
			};
		} else if ((canid == 0x18ffc601 || (msg.payload.type == 'almtsetmin' && msg.payload.action == 1))
			&& msg.payload.psn && msg.payload.psn.length == 8) {
			// ALMSTETMIN: minimum temperature event threshold, query min_temp
			let data = Array.from(Buffer.from(msg.payload.psn, 'hex')).concat(Array(4).fill(0));
			res = {
				canid: msg.payload.canid || '0x18ffc601',
				canfd: false,
				ext: true,
				rtr: false,
				data: data
			};
		} else if ((canid == 0x18ffc603 || (msg.payload.type == 'almtsetmin' && msg.payload.action == 3))
			&& msg.payload.psn && msg.payload.psn.length == 8 && msg.payload.min_temp != null) {
			// ALMSTETMIN: minimum temperature event threshold, program min_temp
			let data = Array.from(Buffer.from(msg.payload.psn, 'hex'));
			// set maximum temperature: (min_temp + 273.15)*100
			let min_temp = Math.round((msg.payload.min_temp + 273.15)*100);
			let xpar = ('0000'+(min_temp).toString(16)).slice(-4)+'0000';
			data = data.concat(Array.from(Buffer.from(xpar, 'hex')));
			res = {
				canid: msg.payload.canid || '0x18ffc603',
				canfd: false,
				ext: true,
				rtr: false,
				data: data
			};
		} else if ((canid == 0x18ffc701 || (msg.payload.type == 'almhsetmax' && msg.payload.action == 1))
			&& msg.payload.psn && msg.payload.psn.length == 8) {
			// ALMHSETMAX: maximum humidity event threshold, query max_rh
			let data = Array.from(Buffer.from(msg.payload.psn, 'hex')).concat(Array(4).fill(0));
			res = {
				canid: msg.payload.canid || '0x18ffc701',
				canfd: false,
				ext: true,
				rtr: false,
				data: data
			};
		} else if ((canid == 0x18ffc703 || (msg.payload.type == 'almhsetmax' && msg.payload.action == 3))
			&& msg.payload.psn && msg.payload.psn.length == 8 && msg.payload.max_rh != null) {
			// ALMHSETMAX: maximum humidity event threshold, program max_rh
			let data = Array.from(Buffer.from(msg.payload.psn, 'hex'));
			// set maximum humidity: max_rh*100
			let apar = [
				Math.abs(msg.payload.max_rh),
				Math.abs(msg.payload.max_rh) - msg.payload.max_rh,
				0,
				0
			];
			data = data.concat(Array.from(Buffer.from(apar)));
			res = {
				canid: msg.payload.canid || '0x18ffc703',
				canfd: false,
				ext: true,
				rtr: false,
				data: data
			};
		} else if ((canid == 0x18ffc801 || (msg.payload.type == 'almhsetmin' && msg.payload.action == 1))
			&& msg.payload.psn && msg.payload.psn.length == 8) {
			// ALMHSETMIN: minimum humidity event threshold, query min_rh
			let data = Array.from(Buffer.from(msg.payload.psn, 'hex')).concat(Array(4).fill(0));
			res = {
				canid: msg.payload.canid || '0x18ffc801',
				canfd: false,
				ext: true,
				rtr: false,
				data: data
			};
		} else if ((canid == 0x18ffc803 || (msg.payload.type == 'almhsetmin' && msg.payload.action == 3))
			&& msg.payload.psn && msg.payload.psn.length == 8 && msg.payload.min_rh != null) {
			// ALMHSETMIN: minimum humidity event threshold, program min_rh
			let data = Array.from(Buffer.from(msg.payload.psn, 'hex'));
			// set minimum humidity: min_rh*100
			let apar = [
				Math.abs(msg.payload.min_rh),
				Math.abs(msg.payload.min_rh) - msg.payload.min_rh,
				0,
				0
			];
			data = data.concat(Array.from(Buffer.from(apar)));
			res = {
				canid: msg.payload.canid || '0x18ffc803',
				canfd: false,
				ext: true,
				rtr: false,
				data: data
			};
		} else if ((canid == 0x18ffc901 || (msg.payload.type == 'almio1set' && msg.payload.action == 1))
			&& msg.payload.psn && msg.payload.psn.length == 8) {
			// ALMIO1SET: maximum and minimum IO1 event threshold, query max_io1, min_io1
			let data = Array.from(Buffer.from(msg.payload.psn, 'hex')).concat(Array(4).fill(0));
			res = {
				canid: msg.payload.canid || '0x18ffc901',
				canfd: false,
				ext: true,
				rtr: false,
				data: data
			};
		} else if ((canid == 0x18ffc903 || (msg.payload.type == 'almio1set' && msg.payload.action == 3))
			&& msg.payload.psn && msg.payload.psn.length == 8 && msg.payload.min_io1 != null && msg.payload.max_io1 != null) {
			// ALMIO1SET: maximum and minimum IO1 event threshold, program max_io1, min_io1
			let data = Array.from(Buffer.from(msg.payload.psn, 'hex'));
			let apar = [
				msg.payload.max_io1,
				msg.payload.min_io1,
				0,
				0
			];
			data = data.concat(Array.from(Buffer.from(apar)));
			res = {
				canid: msg.payload.canid || '0x18ffc903',
				canfd: false,
				ext: true,
				rtr: false,
				data: data
			};
		} else if ((canid == 0x18ffca01 || (msg.payload.type == 'almio2set' && msg.payload.action == 1))
			&& msg.payload.psn && msg.payload.psn.length == 8) {
			// ALMIO2SET: maximum and minimum IO1 event threshold, query max_io2, min_io2
			let data = Array.from(Buffer.from(msg.payload.psn, 'hex')).concat(Array(4).fill(0));
			res = {
				canid: msg.payload.canid || '0x18ffca01',
				canfd: false,
				ext: true,
				rtr: false,
				data: data
			};
		} else if ((canid == 0x18ffca03 || (msg.payload.type == 'almio2set' && msg.payload.action == 3))
			&& msg.payload.psn && msg.payload.psn.length == 8 && msg.payload.min_io2 != null && msg.payload.max_io2 != null) {
			// ALMIO2SET: maximum and minimum IO1 event threshold, program max_io2, min_io2
			let data = Array.from(Buffer.from(msg.payload.psn, 'hex'));
			let apar = [
				msg.payload.max_io2,
				msg.payload.min_io2,
				0,
				0
			];
			data = data.concat(Array.from(Buffer.from(apar)));
			res = {
				canid: msg.payload.canid || '0x18ffca03',
				canfd: false,
				ext: true,
				rtr: false,
				data: data
			};
		} else if ((canid == 0x18ffcb03 || (msg.payload.type == 'sensorcure' && msg.payload.action == 3))
			&& msg.payload.psn && msg.payload.psn.length == 8 && msg.payload.heat_intst != null) {
			let data = Array.from(Buffer.from(msg.payload.psn, 'hex'));
			// SENSORCURE: sensor curing; set heater intensity, heater_intst
			let heat_intst;
			if (msg.payload.heat_intst >= 0 && msg.payload.heat_intst <= 15) {
				heat_intst = msg.payload.heat_intst;
			} else if (msg.payload.heater_intst > 15) {
				heat_intst = 15;
			} else {
				heat_intst = 0;
			}
			data = data.concat(Array.from(Buffer.from([0, 0, 0, heat_intst])));
			res = {
				canid: msg.payload.canid || '0x18ffcb03',
				canfd: false,
				ext: true,
				rtr: false,
				data: data
			};
		} else if ((canid == 0x18ffcc01 || (msg.payload.type == 'maintset' && msg.payload.action == 1))
			&& msg.payload.psn && msg.payload.psn.length == 8) {
			// MAINTSET: maximum and minimum maintenance mode voltage trigger threshold,
			// query max_mntc, min_mntc
			let data = Array.from(Buffer.from(msg.payload.psn, 'hex')).concat(Array(4).fill(0));
			res = {
				canid: msg.payload.canid || '0x18ffcc01',
				canfd: false,
				ext: true,
				rtr: false,
				data: data
			};
		} else if ((canid == 0x18ffcc03 || (msg.payload.type == 'maintset' && msg.payload.action == 3))
			&& msg.payload.psn && msg.payload.psn.length == 8 && msg.payload.min_mntc != null && msg.payload.max_mntc != null) {
			// MAINTSET: maximum and minimum maintenance mode voltage trigger threshold,
			// program max_mntc, min_mntc
			let data = Array.from(Buffer.from(msg.payload.psn, 'hex'));
			let apar = [
				msg.payload.max_mntc,
				msg.payload.min_mntc,
				0,
				0
			];
			data = data.concat(Array.from(Buffer.from(apar)));
			res = {
				canid: msg.payload.canid || '0x18ffcc03',
				canfd: false,
				ext: true,
				rtr: false,
				data: data
			};
		}
		// send socketcan message
		if (res) node.send({ payload: res });
	}
}
