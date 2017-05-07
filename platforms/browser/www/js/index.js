/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

var randomString = function(length) {
	var text = "";
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for(var i = 0; i < length; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
};

var getDistanceFromLatLonInKm = function (lat1,lon1,lat2,lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  // deg2rad below
  var dLon = deg2rad(lon2-lon1); 
  var a = 
	Math.sin(dLat/2) * Math.sin(dLat/2) +
	Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
	Math.sin(dLon/2) * Math.sin(dLon/2)
	; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; // Distance in km
  return d;
};

var deg2rad = function(deg) {
  return deg * (Math.PI/180);
};

var db = null;
var map = null;
var stanja = {
	pocetniEkran: 0,
	pretraga: 1,
	pretragaGotova: 2,
	noviMarker: 3,
	izmenaMarkera: 4,
	pregledMarkera: 5
};
var stanje = null;
var views = {
	pocetniEkran: 1,
	pretraga: 1,
	pretragaGotova: 1,
	noviMarker: 2,
	izmenaMarkera: 2,
	pregledMarkera: 3
};
var aktivirajView = function(view){
	console.log("Prelaz u view " + view);
	for (var i = 1; i <= 3; i++) {
		var viewClass = ".view" + i;
		var atribut = (i==view ? "block" : "none");
		console.log(viewClass + ":" + atribut);
		$(viewClass).css("display", atribut);
	}
};
var tipoviMarkera = {
	zastoj: 1,
	nezgoda: 2,
	udes: 3,
	pomoc: 4
};
var nadjiTipMarkera = function(tip){
	var str = null;
	switch (tip) {
		case tipoviMarkera.zastoj:
			str = "Zastoj";
			break;
		case tipoviMarkera.nezgoda:
			str = "Nezgoda";
			break;
		case tipoviMarkera.udes:
			str = "Udes";
			break;
		case tipoviMarkera.pomoc:
			str = "Pomoc na putu";
			break;
	}
	return str;
};

var LSPretrage = {
	storage: window.localStorage,
	loadLS: function(){
		niz = this.storage.getItem('pretrage');
		if(!niz)
			niz = [];
		else
			niz = JSON.parse(niz);
		
		return niz;
	},
	storeToLS(str){
		niz = this.storage.getItem('pretrage');
		if(!niz)
			niz = [];
		else
			niz = JSON.parse(niz);

		niz.unshift(str);
		if(niz.length > 5)
			niz.splice(5, 1);
		this.storage.setItem('pretrage', JSON.stringify(niz));
	}
};

var privremeniMarker = null;
var noviPrivremeni = function(){
	var prazanMarker = {
		id: null,
		lat: null,
		long: null,
		ime: null,
		autor: null,
		email: null,
		opis: null,
		datum: null,
		fotografija: null,
		tip: null,
		praviMarker: null
	};
	return prazanMarker;
};

var promeniStanje = function(novoStanje, podatak){
	console.log("Prelaz iz stanja " + stanje +" u stanje " + novoStanje);
	switch (stanje) {
		//pocetni ekran
		case stanja.pocetniEkran:
			switch (novoStanje) {
				//pretraga
				case stanja.pretraga:
					$(".selection").css("display","block");
					$("#map").css("display", "none");
					var dodajPretragu = function(pretraga){
						$("#listaPretraga").append('<li class="li-prethodna">'+pretraga+'</li>');
					};
					var lista = LSPretrage.loadLS();
					$("#listaPretraga").empty();
					if(lista){
						for (var i = 0; i < lista.length; i++) {
							dodajPretragu(lista[i]);
						}
					}
					$("#listaPretraga .li-prethodna").click(function(){
						$("#pretragaPolje").val($(this).text());
					});
					stanje = novoStanje;
					break;
				//novi marker
				case stanja.noviMarker:
					aktivirajView(views.noviMarker);
					stanje = novoStanje;
					break;
				//pregled postojeceg markera
				case stanja.pregledMarkera:
					console.log(privremeniMarker.ime);
					$("#pregledLat").empty().append(privremeniMarker.lat);
					$("#pregledLong").empty().append(privremeniMarker.long);
					$("#pregledTip").empty().append(nadjiTipMarkera(privremeniMarker.tip));
					$("#pregledNaziv").empty().append(privremeniMarker.ime);
					$("#pregledOpis").empty().append(privremeniMarker.opis);
					$("#pregledDatum").empty().append(privremeniMarker.datum);
					$("#pregledAutor").empty().append(privremeniMarker.autor);
					$("#pregledEmail").empty().append(privremeniMarker.email);
					$("#pregledSlika").attr('src', privremeniMarker.fotografija);

					aktivirajView(views.pregledMarkera);
					stanje = novoStanje;
					break;
			}
			break;
		//pretraga
		case stanja.pretraga:
			switch (novoStanje) {
				//pretraga gotova
				case stanja.pretragaGotova:
					stanje = novoStanje;
					break;
				//vracanje na pocetni ekran
				case stanja.pocetniEkran:
					$(".selection").css("display","none");
					$("#map").css("display", "block");
					stanje = novoStanje;
					break;
				//pregled markera iz rezultata pretrage
				case stanja.pregledMarkera:
					stanje = novoStanje;
					break;
			}
			break;
		//pretraga gotova
		case stanja.pretragaGotova:
			stanje = stanja.pocetniEkran;
			break;
		//pregled markera
		case stanja.pregledMarkera:
			console.log("usao u switchcase");
			switch (novoStanje) {
				//izmena markera
				case stanja.izmenaMarkera:
					$("#izabLat").empty().append(privremeniMarker.lat);
					$("#izabLong").empty().append(privremeniMarker.long);
					var radios = $('input[name=izmenaTip]');
					radios.filter('[value='+privremeniMarker.tip+']').prop('checked', true);
					$("#izmenaNaziv").val(privremeniMarker.ime);
					$("#izmenaOpis").val(privremeniMarker.opis);
					$("#izmenaDatum").val(privremeniMarker.datum);
					$("#izmenaIme").val(privremeniMarker.autor);
					$("#izmenaEmail").val(privremeniMarker.email);
					$("#izmenaFoto").attr('src', privremeniMarker.fotografija);
					aktivirajView(views.izmenaMarkera);
					stanje = novoStanje;
					break;
				//vracanje na rezultate pretrage
				case stanja.pretragaGotova:
					stanje = novoStanje;
					break;
				//vracanje na pocetni ekran
				case stanja.pocetniEkran:
					console.log("pozvao stanje");
					aktivirajView(views.pocetniEkran);
					stanje = novoStanje;
					break;
			}
			break;
		//izmena markera
		case stanja.izmenaMarkera:
			switch (novoStanje) {
				//vracanje na pregled markera
				case stanja.pregledMarkera:
					$("#pregledTip").empty().append(nadjiTipMarkera(privremeniMarker.tip));
					$("#pregledNaziv").empty().append(privremeniMarker.ime);
					$("#pregledOpis").empty().append(privremeniMarker.opis);
					$("#pregledDatum").empty().append(privremeniMarker.datum);
					$("#pregledAutor").empty().append(privremeniMarker.autor);
					$("#pregledEmail").empty().append(privremeniMarker.email);
					$("#pregledSlika").attr('src', privremeniMarker.fotografija);
					aktivirajView(views.pregledMarkera);
					stanje = novoStanje;
					break;
			}
			break;
		//novi marker
		case stanja.noviMarker:
			switch (novoStanje) {
				//vracanje na pocetni
				case stanja.pocetniEkran:
					aktivirajView(views.pocetniEkran);
					stanje = novoStanje;
					break;
				//pregled sacuvanog
				case stanja.pregledMarkera:
					var m = noviPrivremeni();
					$("#pregledLat").empty().append(privremeniMarker.lat);
					$("#pregledLong").empty().append(privremeniMarker.long);
					$("#pregledTip").empty().append(nadjiTipMarkera(privremeniMarker.tip));
					$("#pregledNaziv").empty().append(privremeniMarker.ime);
					$("#pregledOpis").empty().append(privremeniMarker.opis);
					$("#pregledDatum").empty().append(privremeniMarker.datum);
					$("#pregledAutor").empty().append(privremeniMarker.autor);
					$("#pregledEmail").empty().append(privremeniMarker.email);
					$("#pregledSlika").attr('src', privremeniMarker.fotografija);

					aktivirajView(views.pregledMarkera);
					stanje = novoStanje;
					break;
			}
			break;
	}
};

var startApp = function(){
	//kompas
	function onSuccess(heading) {
		console.log(heading.magneticHeading);
	};
	function onError(compassError) {
		alert('Compass error: ' + compassError.code);
	};
	var options = {
		frequency: 3000
	}; // Update every 3 seconds
	var watchID = navigator.compass.watchHeading(onSuccess, onError, options);

	//resize canvas
	window.addEventListener("orientationchange", function(){
		var canvas = document.getElementById("canvas_logo");
		var ctx = canvas.getContext('2d');
		ctx.canvas.width  = window.innerWidth;
		ctx.canvas.height = 80;
		var img = new Image();
		img.onload = function(){
			var canvasAR = ctx.canvas.width / ctx.canvas.height;
			var imgAR = img.width / img.height;
			var mult = 0;

			var Wpos = ctx.canvas.width;
			if(img.width > ctx.canvas.width){
				var diff = img.width - ctx.canvas.width;
				mult = diff / ctx.canvas.width;
			}
			else{
				Wpos = img.width;
			}
			ctx.drawImage(img, 0, 0, img.width, img.height,
								0, 0, Wpos, ctx.canvas.height-(ctx.canvas.height*mult));
		};
		img.src = "";
		img.src = "img/logo.svg";
	}());
	//insert map
	var mapDiv = document.getElementById('map');
	map = plugin.google.maps.Map.getMap(mapDiv);
	map.addEventListener(plugin.google.maps.event.MAP_READY, onMapReady);
	function onMapReady(){
		console.log("Mapa spremna.");
		var mobileMarker = null;
		//dodaj marker
		map.addMarker({position: {lat: 0, lng: 0},
			title: "Odabrana lokacija.",
			'icon': {
				url: 'www/img/marker.png',
				size: {
					width: 32,
					height: 32
				}
			}
			},
			function(marker) {
			mobileMarker = marker;
			navigator.geolocation.getCurrentPosition(function(position){
				console.log("Lokacija pronadjena.");
				var lat = position.coords.latitude;
				var long = position.coords.longitude;
				map.animateCamera({
					target: {lat: lat, lng: long},
					zoom: 17,
					duration: 1000
					});
				//dodeli koordinate markeru
				if(mobileMarker){
					mobileMarker.setPosition({lat: lat, lng: long});
				}
			});
			marker.on(plugin.google.maps.event.INFO_CLICK, function() {
				marker.showInfoWindow();
			});
		});
		//kretanje kamere
		console.log("Podesavam kretanje kamere.");
		map.addEventListener(plugin.google.maps.event.CAMERA_CHANGE, function(){
			console.log("Kamera se krece.");
			map.getCameraPosition(function(camera) {
				if(mobileMarker)
					mobileMarker.setPosition(camera.target);
			});
		});
	};
	var ocistiMapu = function(){
		map.clear();
		var mobileMarker = null;
		//dodaj marker
		map.addMarker({position: {lat: 0, lng: 0},
			'icon': {
				url: 'www/img/marker.png',
				size: {
					width: 32,
					height: 32
				}
			}
		}, function(marker) {
			mobileMarker = marker;
		});
		//kretanje kamere
		console.log("Podesavam kretanje kamere.");
		map.addEventListener(plugin.google.maps.event.CAMERA_CHANGE, function(){
			console.log("Kamera se krece.");
			map.getCameraPosition(function(camera) {
				if(mobileMarker)
					mobileMarker.setPosition(camera.target);
			});
		});
	};
	//open db
	db = window.sqlitePlugin.openDatabase({name: 'baza1.db', location: 'default'});
	//create db if it does not exist
	db.transaction(function(tx) {
		tx.executeSql('CREATE TABLE IF NOT EXISTS Marker (id integer primary key, lat real, long real, ime text,autor text, email text, opis text, datum text, tip integer, fotografija text)');
	}, function(error) {
		console.log('Transaction ERROR: ' + error.message);
	}, function() {
		console.log('----------Database OK----------');
	});

	var napraviFotografiju = function(){
		navigator.camera.getPicture(onSuccess, onFail, { quality: 80,
			destinationType: Camera.DestinationType.FILE_URI });

		function onSuccess(imageURI) {
			var fname = randomString(10) + ".jpg";
			console.log(imageURI);
			console.log(fname);
			sacuvajFotografiju(imageURI, fname);
		}

		function onFail(message) {
			alert('Failed because: ' + message);
		}
	};
	var sacuvajFotografiju = function(imagePath, fname){
		console.log("usao u funkciju");
		window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function success(dirEntry) {
			console.log("nasao folder");
			window.resolveLocalFileSystemURL(imagePath, function success(fileEntry) {
				console.log("nasao fajl");
				fileEntry.moveTo(dirEntry, fname,
					function(newFileEntry){
						console.log("premestio fajl");
						prikaziFotografiju(newFileEntry.fullPath);
					},
					function(){
						console.log("nije premestio fajl");
					});
			},
			function(){});
		},
		function(){});
	};
	var prikaziFotografiju = function(fname){
		window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function success(dirEntry) {
			dirEntry.getFile(fname, { create: false, exclusive: false }, function (fileEntry) {
				var image = document.getElementById('izmenaFoto');
				image.src = fileEntry.toURL();
				console.log("got file: " + fileEntry.fullPath);
			},
			function(){});
		},
		function(){});
	};
	var obrisiFotografiju = function(path){
		window.resolveLocalFileSystemURL(path, function success(fileEntry) {
			fileEntry.remove(function(){
				var image = document.getElementById('izmenaFoto');
				image.src = "";
			},function(){},function(){});
		});
	};

	//jquery-dependent code
	$(document).ready(function(){
		stanje = stanja.pocetniEkran;
		$("#pretragaPolje").focus(function(){
			promeniStanje(stanja.pretraga);
		});
		$("#dugmeDodaj").click(function(){
			//isprazni sva polja
			privremeniMarker = noviPrivremeni();
			map.getCameraPosition(function(camera) {
				privremeniMarker.lat = camera.target.lat;
				privremeniMarker.long = camera.target.lng;
				$("#izabLat").empty().append(privremeniMarker.lat);
				$("#izabLong").empty().append(privremeniMarker.long);
				});
			$("#izmenaNaziv,#izmenaOpis, #izmenaIme, #izmenaEmail").val('');
			
			var isoStr = new Date().toISOString();
			$('#izmenaDatum').val(isoStr.substring(0,isoStr.length-5));
			$("#izmenaFoto").attr("src","");
			var radios = $('input[name=izmenaTip]');
			radios.filter('[value=1]').prop('checked', true);
			promeniStanje(stanja.noviMarker);
		});
		//resetovanje na korisnicku lokaciju
		$("#dugmeLociraj").click(function(){
			promeniStanje(stanja.pocetniEkran);
			console.log("Lociram korisnika.");
			navigator.geolocation.getCurrentPosition(function(position){
				map.animateCamera({
					target: {lat: position.coords.latitude, lng: position.coords.longitude},
					zoom: 17,
					duration: 1500
				});
			});
		});
		$("#dugmeSacuvaj").click(function(){
			//povadi podatke iz svih polja u promenljivu
			privremeniMarker.ime = $("#izmenaNaziv").val();
			privremeniMarker.tip  = $('input[name="izmenaTip"]:checked').val();
			privremeniMarker.opis = $("#izmenaOpis").val();
			privremeniMarker.datum = $("#izmenaDatum").val();
			privremeniMarker.autor = $("#izmenaIme").val();
			privremeniMarker.email = $("#izmenaEmail").val();
			privremeniMarker.fotografija = $("#izmenaFoto").attr('src');
			if(stanje == stanja.noviMarker){
				db.transaction(function(tx){
					tx.executeSql("INSERT INTO Marker (lat, long, ime, autor, email, opis, datum, tip, fotografija) VALUES (?,?,?,?,?,?,?,?,?)",
						[privremeniMarker.lat,
						privremeniMarker.long,
						privremeniMarker.ime,
						privremeniMarker.autor,
						privremeniMarker.email,
						privremeniMarker.opis,
						privremeniMarker.datum,
						privremeniMarker.tip,
						privremeniMarker.fotografija],
						function(tx, res){
							privremeniMarker.id = res.insertId;
							alert("Marker je uspesno dodat u bazu!");
							promeniStanje(stanja.pregledMarkera);
						},
						function(tx, e){
							alert(e.message);
						});
				});
			}
			else if(stanje == stanja.izmenaMarkera){
				db.transaction(function(tx){
					tx.executeSql("UPDATE Marker SET ime = ?, autor = ?, email = ?, opis = ?, datum = ?, tip = ?, fotografija = ? WHERE id = ?",
						[privremeniMarker.ime,
						privremeniMarker.autor,
						privremeniMarker.email,
						privremeniMarker.opis,
						privremeniMarker.datum,
						privremeniMarker.tip,
						privremeniMarker.fotografija,
						privremeniMarker.id],
						function(tx, res){
							alert("Marker je uspesno izmenjen!");
							promeniStanje(stanja.pregledMarkera);
						},
						function(tx, e){
							alert(e.message);
						});
				});
			}
		});
		$("#dugmeOtkazi").click(function(){
			if(stanje == stanja.izmenaMarkera)
				promeniStanje(stanja.pregledMarkera);
			if(stanje == stanja.noviMarker)
				promeniStanje(stanja.pocetniEkran);
		});
		$("#brisiMarker").click(function(){
			var pitanje = confirm("Da li zelite da obrisete ovaj marker?");
			if(pitanje == true){
				//brisi sliku
				obrisiFotografiju(privremeniMarker.fotografija);
				//brisi marker
				db.transaction(function(tx){
					tx.executeSql("DELETE FROM Marker WHERE id = ?", [privremeniMarker.id]);
				});
				if(privremeniMarker.praviMarker !== undefined &&
					privremeniMarker.praviMarker !== null){
					privremeniMarker.praviMarker.remove();
				}
				promeniStanje(stanja.pocetniEkran);
			}
		});
		$("#izmeniMarker").click(function(){
			promeniStanje(stanja.izmenaMarkera);
		});
		$("#nazadSaPregleda").click(function(){
			promeniStanje(stanja.pocetniEkran);
		});
		$("#novaFoto").click(function(){
			napraviFotografiju();
		});
		$("#pretragaDugme").click(function(){
			var markeri = [];
			//izvuci tekst
			var tekstPretrage = $('#pretragaPolje').val();
			//izvuci tip
			var tipPretrage = parseInt($('input[name="pretragaRadio"]:checked').val());
			//izvuci precnik
			var precnikPretrage = parseInt($('#pretragaPrecnik').val(), 10);
			//trenutna lokacija na mapi
			var pozicijaKamere = {lat: 0, long: 0};
			//dodaj u local storage
			if(tekstPretrage)
				if(tekstPretrage.length > 0)
					LSPretrage.storeToLS(tekstPretrage);
			//nastavi
			map.getCameraPosition(function(camera) {
				console.log("Nasao poziciju kamere.");
				pozicijaKamere.lat = camera.target.lat;
				pozicijaKamere.long = camera.target.lng;
				//pokreni upit
				console.log("Pokrecem upit.");
				db.transaction(function(tx){
					tx.executeSql('SELECT * FROM Marker WHERE (ime LIKE ?) AND (tip = ?)',
						['%'+tekstPretrage+'%', tipPretrage],
						function(tx, result){
							console.log("Rezultat upita redova: " + result.rows.length);
							for (var i = 0; i < result.rows.length; i++) {
								//pravimo privremeni marker
								var tempmark = noviPrivremeni();
								tempmark.id = result.rows.item(i).id;
								tempmark.lat = result.rows.item(i).lat;
								tempmark.long = result.rows.item(i).long;
								tempmark.ime = result.rows.item(i).ime;
								tempmark.tip = result.rows.item(i).tip;
								tempmark.opis = result.rows.item(i).opis;
								tempmark.datum = result.rows.item(i).datum;
								tempmark.autor = result.rows.item(i).autor;
								tempmark.email = result.rows.item(i).email;
								tempmark.fotografija = result.rows.item(i).fotografija;
								var distance = getDistanceFromLatLonInKm(pozicijaKamere.lat, pozicijaKamere.long, tempmark.lat, tempmark.long) * 1000;
								console.log("Distanca za marker " + i + " je " + distance);
								if(precnikPretrage){
									if(distanca <= precnikPretrage)
										markeri.push(tempmark);
								}
								else{
									markeri.push(tempmark);
								}
							}
							//dodaj na mapu
							ocistiMapu();
							var koordinateGranica = [];
							//var graniceMape = new plugin.google.maps.LatLngBounds();
							for (var i = 0; i < markeri.length; i++) {
								var templat = markeri[i].lat;
								var templng = markeri[i].long;
								koordinateGranica.push(new plugin.google.maps.LatLng(templat+0.0005, templng+0.0005));
								koordinateGranica.push(new plugin.google.maps.LatLng(templat-0.0005, templng-0.0005));
								var dodajMarker = function(kopija){
									map.addMarker({
										position: {lat: templat, lng: templng}
									}, function(mapMarker){
										console.log(kopija.ime);
										mapMarker.on(plugin.google.maps.event.MARKER_CLICK, function(){
											console.log("Zovem click handler.");
											privremeniMarker = kopija;
											privremeniMarker.praviMarker = mapMarker;
											promeniStanje(stanja.pregledMarkera);
										});
									});
								};
								dodajMarker($.extend(true, {}, markeri[i]));
							}
							//sredi granice mape
							//map.fitBounds(graniceMape);
							//var graniceMape = new plugin.google.maps.LatLngBounds(koordinateGranica);
							map.animateCamera({
								'target' : koordinateGranica,
								duration: 500
							});
							//promeni stanje
							promeniStanje(stanja.pocetniEkran);
						},
						function(tx, error){
							alert(error.message);
						});
				});
				//filtriraj po distanci
				//stavi markere na mapu
			});
		});
		$("#brisiFoto").click(function(){
			var image = document.getElementById('izmenaFoto');
			if(image.src)
				obrisiFotografiju(image.src);
		});
	}); //document.ready()
}; //startApp()

var app = {
	// Application Constructor
	initialize: function() {
		document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
	},

	// deviceready Event Handler
	//
	// Bind any cordova events here. Common events are:
	// 'pause', 'resume', etc.
	onDeviceReady: function() {
		startApp();
		this.receivedEvent('deviceready');
	},

	// Update DOM on a Received Event
	receivedEvent: function(id) {
		var parentElement = document.getElementById(id);
		var listeningElement = parentElement.querySelector('.listening');
		var receivedElement = parentElement.querySelector('.received');

		listeningElement.setAttribute('style', 'display:none;');
		receivedElement.setAttribute('style', 'display:block;');

		console.log('Received Event: ' + id);
	}
};

app.initialize();