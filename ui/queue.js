var QueueApp = {
	init: function () {
		this.canvas = Raphael("canvas", 600, 400);
		
		// File menu
		$( "#new_file" ).button({text: false, icons: {primary: "ui-icon-document"}})
		.click(function () {
			QueueApp.reset();
		});
		$( "#load_file" ).button({text: false, icons: {primary: "ui-icon-folder-open"}});
		$( "#save_file" ).button({text: false,icons: {primary: "ui-icon-disk"}})
		.click(function () {
			QueueApp.save();
		});
		$("#file_ops").buttonset();
		
		// Add elements menu
	
		$("#connect").button({icons: {primary: "ui-icon-arrowthick-2-se-nw"}})
		.click(function () {
			QueueApp.toggleConnections();
		});
		$("#properties").button({icons: {primary: "ui-icon-wrench"}});
		$("#delete").button({icons: {primary: "ui-icon-scissors"}});
		$("#new_ops").buttonset().hide();
		
		// Simulation menu
		$("#play_sim").button({icons: {primary: "ui-icon-play"}}).click(function () {
			$("#progressbar").toggle();
			$("#sim_play_ops").toggle();
			$("#new_ops").toggle();
			$("#file_ops").toggle();
			$("#sim_ops").toggle();
			
			QueueApp.startSim();
		});
		$("#config_sim").button({icons: {primary: "ui-icon-clock"}}).click(function () {
			$("#server_form").dialog('open');
		});
		$("#sim_ops").buttonset();
		
		$("#pause_sim").button({text: false, icons: {primary: "ui-icon-pause"}}).click(function () {
			if (QueueApp.paused) {
				QueueApp.paused = false;
				QueueApp.run();
			} else {
				QueueApp.pauseSim();
			}
		});
		$("#stop_sim").button({text: false, icons: {primary: "ui-icon-stop"}}).click(function () {
			$("#progressbar").toggle();
			$("#sim_play_ops").toggle();
			$("#new_ops").toggle();
			$("#file_ops").toggle();
			$("#sim_ops").toggle();
		});
		
		$("#sim_play_ops").buttonset().hide();
		this.progress = $("#progressbar");
		this.progress.progressbar().hide();
		
		$("#server_form").dialog({
			autoOpen: false,
			height: 250,
			width: 250,
			modal: false,
			resizable: false,
			buttons: {
				'Delete this server': function () {
					
				},
				'Save': function () {
					
				}
			},
			open: function() {
				var $buttonPane = $(this).parent();
				$buttonPane.find('button:first')
				.css({'color': 'red', 'margin-right': '55px'})
				.button({icons: {primary:'ui-icon-trash'}});
			}
		});
	},
	
	reset: function () {
		// Delete data from old run, if present
		var len, i;
		
		if (this.models) {
			len = this.models.length;
			for (i = len - 1; i >= 0; i --) {
				if (this.models[i].unlink) this.models[i].unlink();
			}
		}
		
		this.sim = null;
		this.showConn = false;
		this.server_id = 0;
		this.source_id = 0;
		this.splitter_id = 0;
		this.monitor_id = 0;
		
		this.canvas.clear();
		this.posx = 50;
		this.posy = 50;
		this.views = [];
		this.models = [];
		
		var a = [];
		for (var i = 0; i <= 600; i+= 50) {
			a.push("M" + i + " 0L" + i + " 400");
			a.push("M0 " + i + "L600 " + i);
		}
		var l1 = this.canvas.path(a.join(""));
		l1.attr({'stroke-width': 0.5, 'stroke': 'pink'});
		this.canvas.path("M0 0L0 400L600 400L600 0L0 0")
		.attr({'stroke-width': 4, 'stroke': 'pink'});
		

		for (var i = 0; i < 4; i ++) {
			this.canvas.rect(10, 10 + 50 * i, 50, 50)
			.attr({fill: '#FAF6AA', 'fill-opacity': '50', stroke: 'F7D68A'});
		}

		var q = this.canvas.image("images/server.png", 12, 25, 46.4, 22);
		var s = this.canvas.image("images/customers.png", 15, 70, 34, 34);
		var sp = this.canvas.image("images/splitter.png", 15, 115, 41*0.9, 48*0.9);
		
		function setDragger(obj, origx, origy, fn) {
			obj.drag(	
				function (dx, dy) {
					this.attr({x: this.ox + dx, y: this.oy + dy});
				},
				function () {
					this.ox = this.attr('x');
					this.oy = this.attr('y');
				},
				function () {
					var x = this.attr('x');
					var y = this.attr('y');
					this.attr({x: origx, y: origy});
					fn.call(QueueApp, x, y);
				});
		}
		
		setDragger(q, 12, 25, QueueApp.newServer);
		setDragger(s, 15, 70, QueueApp.newSource);
		setDragger(sp, 15, 115, QueueApp.newSplitter);
/*		
		q.drag(
			function (dx, dy) {
				this.attr({x: this.ox + dx, y: this.oy + dy});
			},
			function () {
				this.ox = this.attr('x');
				this.oy = this.attr('y');
			},
			function () {
				var x = this.attr('x');
				var y = this.attr('y');
				this.attr({x: 10, y: 25});
				QueueApp.newServer(x, y);
			}
		);
	*/
	},
	
	updateDrop: function () {
		this.posx += 20;
		this.posy += 20;
		if (this.posy > 360) {
			this.posy = 20;
			this.posx -= 200;
		}
	},
	
	newView: function (ViewFn, ModelFn, type, name, hasIn, hasOut, x, y) {
		if (!x) {
			x = this.posx;
			y = this.posy;
			this.updateDrop();
		}
		var obj = new ViewFn(this.canvas, type, name, x, y, hasIn, hasOut);
		if (this.showConn) obj.showDots(true);
		this.views.push(obj);
		
		var model = new ModelFn(obj);
		obj.model = model;
		this.models.push(model);
		return obj;
	},
	
	newServer: function (x, y) {
		this.server_id++;
		return this.newView(ImageView, ServerModel, 'queue', 
			'queue_' + this.server_id, true, true, x, y);
	},
	
	newSource: function (x, y) {
		this.source_id++;
		return this.newView(ImageView, SourceModel, 
			'source', 'source_' + this.source_id, false, true, x, y);		
	},
	
	newSplitter: function (x, y) {
		this.splitter_id ++;
		return this.newView(SplitterView, SplitterModel, 
					'splitter', 'splitter_' + this.splitter_id, true, true, x, y);
	},
	
	newMonitor: function () {
		
	},
	
	toggleConnections: function () {
		this.showConn = !this.showConn;
		var len = this.views.length;
		for (var i = len - 1; i >= 0; i--) {
			var obj = this.views[i];
			obj.showDots(this.showConn);
		}
	},
	
	save: function () {
		var str = this.stringify();
		console.log(str);
	},
	
	load: function (text) {
		var json = JSON.parse(text);
		var len = json.length;
		var dict = {};
		for (var i = len - 1; i >= 0; i--) {
			var conf = json[i];
			var obj = null;

			if (conf.type === 'queue') {
				obj = this.newServer();
			} else if (conf.type === 'source') {
				obj = this.newSource();
			} else if (conf.type === 'splitter') {
				obj = this.newSplitter();
			}
			
			obj.moveto(conf.x, conf.y);
			obj.name = conf.name;
			dict[conf.name] = obj;
		}
		
		for (var i = len - 1; i >= 0; i--) {
			var conf = json[i];
			if (conf.out) {
				var from = dict[conf.name];
				if (!from) continue;
				
				if (conf.out instanceof Array) {
					for (var j = conf.out.length - 1; j >= 0; j--) {
						var to = dict[conf.out[j]];
						if (to) from.connect(to, j);
					}
				} else {
					var to = dict[conf.out];
					if (to) from.connect(to);
					
				}
			}
		}
	},
	
	stringify: function () {
		var str = [];
		var len = this.views.length;
		for (var i = len - 1; i >= 0; i--) {
			str.push(this.views[i].jsonify());
		}
		return JSON.stringify(str);
	},
	
	parse: function (json) {
		
	},

	startSim: function () {
		var len, i, model;
		this.sim = new Sim();
		this.random = new Random(1234);
		
		len = this.models.length;
		for (i = len - 1; i >= 0; i --) {
			this.models[i].start();
		}
		
		for (i = len - 1; i >= 0; i --) {
			this.models[i].connect();
		}
		
		this.sim.setLogger(function (msg) {
			console.log(msg);
		});
		
		this.playing = true;
		this.paused = false;
		this.until = 25000;
		this.startedAt = new Date().getTime();
		this.run();
	},
	
	pauseSim: function () {
		this.paused = true;
	},

	IntervalLow: 40,
	Interval: 50,
	IntervalHigh: 60,
	EventsPerInterval: 100,
	IntervalPause: 0,

	run: function () {
		var app = QueueApp;
		var start = new Date().getTime();
		var completed = app.sim.simulate(app.until, app.EventsPerInterval);
		var end = new Date().getTime();
		
//		sp.simTimeDisplay.text(sp.sim.time());
//		var eventsPerSec = sp.EventsPerInterval / (end - start) * 1000;
//		sp.eventsSecDisplay.text(end - sp.startedAt);
	//	sp.eventsSecDisplay.append([end-start, end-sp.startedAt, sp.EventsPerInterval, "]"].join(", "));
		
		var diff = end - start;
		if (diff < app.IntervalLow || diff > app.IntervalHigh) {
			app.EventsPerInterval = Math.floor(app.EventsPerInterval / diff * app.Interval);
		}
		
		app.progress.progressbar({value: app.sim.time() * 100 / app.until});
		
		if (completed) {
			QueueApp.complete();
			return;
		}
		
		if (!app.playing) {
//			if (app.callback) sp.callback(sp.STOP);
			return;
		}
		
		if (app.paused) {
//			if (app.callback) app.callback(sp.PAUSE);
			return;
		}
		
		setTimeout(app.run, app.IntervalPause);
	},
	
	complete: function () {
		console.log("completed " + this.sim.time());
		var sim = this.sim;
		for (var i = 0; i < QueueApp.models.length; i++) {
			var model = QueueApp.models[i];
			if (model.stat) model.showStats();

			/*
				var msg = "<pre>Queue = " + model.view.name
				+ "\nSimulation Time = " + sim.time()
				+ "\nArrivals = " + service.queueStats().durationSeries.count()
				+ "\nUsage = " + (service.usage() / sim.time())
				+ "\nService mean time = " + service.systemStats().durationSeries.average()
				+ "\nService mean customer = " + service.systemStats().sizeSeries.average()
				+ "\nQueue mean time = " + service.queueStats().durationSeries.average()
				+ "\nQueue mean customer = " + service.queueStats().sizeSeries.average()
				+ "</pre>";
				$('#log').append(msg);
				*/
		}
	}
	
};
/*****************************************************************/
Raphael.fn.connection = function (obj1, obj2, line, bg) {
    if (obj1.line && obj1.from && obj1.to) {
        line = obj1;
        obj1 = line.from;
        obj2 = line.to;
    }

	 var bb1 = obj1.getBBox(),
	        bb2 = obj2.getBBox(),
			x1 = bb1.x + bb1.width + 1,
			y1 = bb1.y + bb1.height / 2,
			x4 = bb2.x - 1,
			y4 = bb2.y + bb2.height / 2,
			res = [3, 6];

    dx = Math.max(Math.abs(x1 - x4) / 2, 10);
    dy = Math.max(Math.abs(y1 - y4) / 2, 10);
    var x2 = [x1, x1, x1 - dx, x1 + dx][res[0]].toFixed(3),
        y2 = [y1 - dy, y1 + dy, y1, y1][res[0]].toFixed(3),
        x3 = [0, 0, 0, 0, x4, x4, x4 - dx, x4 + dx][res[1]].toFixed(3),
        y3 = [0, 0, 0, 0, y1 + dy, y1 - dy, y4, y4][res[1]].toFixed(3);
    var path = ["M", x1.toFixed(3), y1.toFixed(3), "C", x2, y2, x3, y3, x4.toFixed(3), y4.toFixed(3)].join(",");
    if (line && line.line) {
        line.bg && line.bg.attr({path: path});
        line.line.attr({path: path});
    } else {
        var color = typeof line == "string" ? line : "#000";
        return {
            bg: bg && bg.split && this.path(path).attr({stroke: bg.split("|")[0], fill: "none", "stroke-width": bg.split("|")[1] || 3}),
            line: this.path(path).attr({stroke: color, fill: "none"}),
            from: obj1,
            to: obj2
        };
    }
};


/***************************************************/
var ImageView = function (canvas, type, name, x, y, hasIn, hasOut) {
	this.canvas = canvas;
	this.type = type;
	this.name = name;

	
	if (type === 'queue') {
		this.image = canvas.image('images/server.png', x, y, 116, 55);
		this.width = 116;
		this.height = 55;
	} else if (type === 'source') {
		this.image = canvas.image('images/customers.png', x, y, 34, 34);
		this.width = 34;
		this.height = 34;
	} else if (type === 'monitor') {
		
	}
	this.x = x;
	this.y = y;
	this.hasIn = hasIn;
	this.hasOut = hasOut;
	

	this.settings = canvas.image("images/settings.gif", x, y, 12, 12);
	
	this.text = canvas.text(x, y, this.name);

	this.image.attr({cursor: 'move'});	
	this.image.view = this;
	this.image.animate({scale: "1.2 1.2"}, 200, function () {
		this.animate({scale: "1 1"}, 200);		
	});
	
	if (this.hasOut) {
		this.arrow = canvas.image("images/orange-arrow.gif", x, y, 12, 12);
		this.arrow.view = this;
		this.arrow.drag(
			function (dx, dy) {
				this.attr({x: this.ox + dx, y: this.oy + dy});
				this.paper.connection(this.conn);
			}, 
			function () {
				this.conn = this.paper.connection(this.view.image, this, "#000");
				this.ox = this.attr("x");
				this.oy = this.attr("y");
			},
			function () {
				this.conn.line.remove();
				this.conn = null;
			
				var views = QueueApp.views;
				var len = views.length;
				var x = this.attr('x'),
				var y = this.attr('y');
			
				for (var i = len - 1; i >= 0; i--) {
					var obj = views[i];
					if (obj.acceptDrop(x, y)) {
						this.hide();
						this.view.connect(obj);
						return;
					}
				}

				var view = this.view;
				this.attr({x: view.x + view.width + 2, y: view.y + view.height / 2 - 6});
			});
	}
	
	// move
	this.moveto(x, y);

	// Set up event listeners	
	this.image.drag(
		function (dx, dy) {
			var view = this.view;
			view.moveto(view.ox + dx, view.oy + dy);
		},
		function () {
			var view = this.view;
			view.ox = view.x;
			view.oy = view.y;
		}, 
		function () {

		});
}


ImageView.prototype.moveto = function (x, y) {
	var len, i, dot;
	
	if (x > 600 - this.width || y > 400 - this.height || x < 0 || y < 0) {
		return;
	}
	
	this.x = x;
	this.y = y;
	
	this.image.attr({x: x, y: y});
	this.text.attr({x: this.x + this.width / 2, y: this.y + this.height + 5});
	this.arrow.attr({x: this.x + this.width + 2, y: this.y + this.height / 2 - 6});
	this.settings.attr({x: this.x - 4, y: this.y - 12});
	
	if (this.hasIn) {
		var len = QueueApp.views.length;
		for (var i = len - 1; i >= 0; i--) {
			QueueApp.views[i].moveConnection(this);
		}
	}
	
	if (this.arrow && this.arrow.conn) {
		this.canvas.connection(this.arrow.conn);
	}
};


ImageView.prototype.connect = function (to) {
	var conn = this.canvas.connection(this.image, to.dropObject(), "#000");
	conn.line.attr({'stroke-width': 3, 'stroke': '#F7D68A'});
	conn.fromView = this;
	conn.toView = to;
	this.arrow.conn = conn;
	this.model.dest = to.model;
};

ImageView.prototype.dropObject = function () {
	return this.image;
};

ImageView.prototype.acceptDrop = function (x, y) {
	return (x > this.x && x < this.x + this.width
			&& y > this.y && y < this.y + this.height);
};

ImageView.prototype.moveConnection = function (dest) {
	if (this.arrow && this.arrow.conn && this.arrow.conn.toView === dest) {
		this.canvas.connection(this.arrow.conn);
	}
};

ImageView.prototype.deleteConnection = function (peer) {
	
};

ImageView.prototype.jsonify = function () {
	var json = {
		x: this.x, 
		y: this.y,
		type: this.type,
		name: this.name};
	
	if (this.arrow && this.arrow.conn) {
		json.out = this.arrow.conn.toView.name;
	}
	
	if (this.model) {
		json.model = this.model.jsonify();
	}
	
	return json;
};

/***************************************************/
var SplitterView = function (canvas, type, name, x, y, hasIn, hasOut) {
	this.canvas = canvas;
	this.type = type;
	this.name = name;

	this.hidden = [canvas.rect(x, y, 10, 10), canvas.rect(x, y, 10, 10)];
	this.image = canvas.image('images/splitter.png', x, y, 41, 48);
	this.width = 41;
	this.height = 48;

	this.x = x;
	this.y = y;

	this.hidden[0].attr({'stroke-width': '0'});
	this.hidden[1].attr({'stroke-width': '0'});
	this.image.attr({cursor: 'move'});	
	this.image.view = this;
	this.image.animate({scale: "1.2 1.2"}, 200, function () {
		this.animate({scale: "1 1"}, 200);		
	});
	
	this.indot = null;
	this.outdots = [null, null];
	
	this.indot = canvas.circle(x, y, 4);
	this.indot.attr({fill: "#b33"});
	this.indot.view = this;
	this.indot.hide();

	
	for (var i = 0; i < 2; i++) {
		var out = canvas.circle(x, y, 4);
		out.attr({fill: "#3b3"});
		out.view = this;
		out.id = i;
		out.hide();
		out.drag(
			function (dx, dy) {
				this.attr({cx: this.ox + dx, cy: this.oy + dy});
				this.paper.connection(this.conn);
			}, 
			function () {
				var from = this.view.hidden[this.id];
				this.conn = this.paper.connection(from, this, "#000");
				this.ox = this.attr("cx");
				this.oy = this.attr("cy");
			},
			function () {
				this.conn.line.remove();
				this.conn = null;
				
				var views = QueueApp.views;
				var len = views.length;
				var x = this.attr('cx'),
				var y = this.attr('cy');
				
				for (var i = len - 1; i >= 0; i--) {
					var obj = views[i];
					if (obj.acceptDrop(x, y)) {
						this.hide();
						this.view.connect(obj, this.id);
						return;
					}
				}

				var view = this.view;
				if (this.id === 0) {
					this.attr({cx: view.x + view.width + 2, cy: view.y + 10});
				} else {
					this.attr({cx: view.x + view.width + 2, cy: view.y + view.height - 10});
				}
			
			});
		this.outdots[i] = out;
	}

	
	// move
	this.moveto(x, y);

	// Set up event listeners	
	this.image.drag(
		function (dx, dy) {
			var view = this.view;
			view.moveto(view.ox + dx, view.oy + dy);
		},
		function () {
			var view = this.view;
			view.ox = view.x;
			view.oy = view.y;
		}, 
		function () {

		});
}

SplitterView.prototype.moveto = function (x, y) {
	var len, i, dot;
	
	if (x > 600 - this.width || y > 400 - this.height || x < 0 || y < 0) {
		return;
	}
	
	this.x = x;
	this.y = y;
	
	this.image.attr({x: x, y: y});
	
	this.hidden[0].attr({x: this.x + this.width - 20,
					   y: this.y + 5});
	this.hidden[1].attr({x: this.x + this.width - 20,
					   y: this.y + this.height - 15});

	this.indot.attr({cx: this.x - 5, cy: this.y + this.height / 2});

	var len = QueueApp.views.length;
	for (var i = len - 1; i >= 0; i--) {
		QueueApp.views[i].moveConnection(this);
	}

	var dot = this.outdots[0];
	dot.attr({cx: this.x + this.width + 2, cy: this.y + 10});
	if (dot.conn) { this.canvas.connection(dot.conn);}

	var dot = this.outdots[1];
	dot.attr({cx: this.x + this.width + 2, cy: this.y + this.height - 10});
	if (dot.conn) { this.canvas.connection(dot.conn);}	
};

SplitterView.prototype.showDots = function (show) {
	var dot;
	if (show) this.indot.show(); else this.indot.hide();
	dot = this.outdots[0];
	if (show && !dot.conn) dot.show(); else dot.hide();
	dot = this.outdots[1];
	if (show && !dot.conn) dot.show(); else dot.hide();
};

SplitterView.prototype.connect = function (to, channel) {
	var conn = this.canvas.connection(this.hidden[channel], to.dropObject(), "#000");
	conn.line.attr({'stroke-width': 3});
	conn.fromView = this;
	conn.toView = to;
	this.outdots[channel].conn = conn;
	this.model.dest[channel] = to.model;
};

SplitterView.prototype.dropObject = function () {
	return this.image;
};

SplitterView.prototype.acceptDrop = function (x, y) {
	var cx = this.x - 2;
	var cy = this.y + this.height / 2;
	
	return ((cx - x) * (cx - x) + (cy - y) * (cy - y) < 16);
};

SplitterView.prototype.moveConnection = function (dest) {
	for (var i = 0; i < 2; i ++) {
		var dot = this.outdots[i];
		if (dot && dot.conn && dot.conn.toView === dest) {
			this.canvas.connection(dot.conn);
		}
	}
};

SplitterView.prototype.deleteConnection = function (peer) {
	
};

SplitterView.prototype.jsonify = function () {
	var json = {
		x: this.x, 
		y: this.y,
		type: this.type,
		name: this.name,
		out: [null, null]};
	
	
	for (var i = 0; i < 2; i ++) {
		var dot = this.outdots[i];
		if (dot.conn) json.out[i] = dot.conn.toView.name;
	}

	if (this.model) {
		json.model = this.model.jsonify();
	}
	
	return json;
};

/***************************************************/

function ServerModel(view) {
	this.view = view;
	this.nservers = 1;
	this.mu = 1;
	this.infinite = true;
	this.maxqlen = 0;
	
	this.entity = null;
	this.dest = null;
	this.statTable = $('#server_stats').clone().attr('id', view.name);
	this.statTable.find('h2').text(view.name);
	
	$("#results").append(this.statTable);
	this.stat = [
		this.statTable.find('#arrival'),
		this.statTable.find('#sutil'),
		this.statTable.find('#qtime'),
		this.statTable.find('#stime'),
		this.statTable.find('#qsize'),
		this.statTable.find('#ssize'),
		this.statTable.find('#qtimed'),
		this.statTable.find('#stimed'),
		this.statTable.find('#qsized'),
		this.statTable.find('#ssized')
	];
}

ServerModel.prototype.jsonify = function () {
	return {
		nservers: this.nservers,
		mu: this.mu,
		infinite: this.infinite,
		maxqlen: this.maxqlen
	};
};

ServerModel.prototype.start = function () {
	this.entity = QueueApp.sim.addEntity(ServerEntity, this.nservers, this.mu);
	
};

ServerModel.prototype.connect = function () {
	if (this.dest) {
		this.entity.dest = this.dest.entity;
	}
};

ServerModel.prototype.showStats = function () {
	var service = this.entity.facility;
	var qd = service.queueStats().durationSeries;
	var qs = service.queueStats().sizeSeries;
	var sd = service.systemStats().durationSeries;
	var ss = service.systemStats().sizeSeries;
	var usage = service.usage() / QueueApp.sim.time() * 100;
	this.stat[0].text(qd.count());
	this.stat[1].text(usage.toFixed(1) + "%");
	this.stat[2].text(qd.average().toFixed(3));
	this.stat[3].text(sd.average().toFixed(3));
	this.stat[4].text(qs.average().toFixed(3));
	this.stat[5].text(ss.average().toFixed(3));
	this.stat[6].text(qd.deviation().toFixed(3));
	this.stat[7].text(sd.deviation().toFixed(3));
	this.stat[8].text(qs.deviation().toFixed(3));
	this.stat[9].text(ss.deviation().toFixed(3));
};

ServerModel.prototype.unlink = function () {
	this.statTable.remove();
}

/*-------------------------*/
function SourceModel(view) {
	this.view = view;
	this.lambda = 0.25;
	this.dest = null;
}

SourceModel.prototype.jsonify = function () {
	return {
		lambda: this.lambda
	};
};

SourceModel.prototype.start = function () {
	this.entity = QueueApp.sim.addEntity(SourceEntity, this.lambda);
};

SourceModel.prototype.connect = function () {
	if (this.dest) {
		this.entity.dest = this.dest.entity;
	}
};

/*-------------------------*/
function SplitterModel(view) {
	this.view = view;
	this.prob = 0.5;
	this.dest = [null, null];
}

SplitterModel.prototype.jsonify = function () {
	return {prob: this.prob};
};

SplitterModel.prototype.start = function () {
	this.entity = QueueApp.sim.addEntity(SplitterEntity, this.prob);
};

SplitterModel.prototype.connect = function () {
	if (this.dest[0]) {
		this.entity.dest1 = this.dest[0].entity;
	}
	
	if (this.dest[1]) {
		this.entity.dest2 = this.dest[1].entity;
	}
};

/***************************************************/

var ServerEntity = {
	start: function (nservers, mu) {
		this.mu = mu;
		this.facility = new Sim.Facility('queue');
	},

	arrive: function (from) {
		var duration = QueueApp.random.exponential(this.mu);
		var ro = this.useFacility(this.facility, duration);
		if (this.dest) {
			ro.done(this.dest.arrive, this.dest, this);
		}
	}
};

/*-------------------------*/
var SourceEntity = {
	start: function (lambda) {
		this.lambda = lambda;
		this.setTimer(0).done(this.traffic);
	},
	
	traffic: function () {
		if (!this.dest) return;

		var duration = QueueApp.random.exponential(this.lambda);

		this.setTimer(duration)
		.done(this.dest.arrive, this.dest, this)
		.done(this.traffic);
	}
};

/*-------------------------*/
var SplitterEntity = {
	start: function (prob) {
		this.prob = prob;
	},
	
	arrive: function () {
		var r = QueueApp.random.uniform(0.0, 1.0);
		if (r < this.prob) {
			if (this.dest1) this.dest1.arrive();
		} else {
			if (this.dest2) this.dest2.arrive();
		}
	}
};