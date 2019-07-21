function _classCallCheck(a,b){if(!(a instanceof b))throw new TypeError("Cannot call a class as a function")}function _defineProperties(a,b){for(var c,d=0;d<b.length;d++)c=b[d],c.enumerable=c.enumerable||!1,c.configurable=!0,"value"in c&&(c.writable=!0),Object.defineProperty(a,c.key,c)}function _createClass(a,b,c){return b&&_defineProperties(a.prototype,b),c&&_defineProperties(a,c),a}var crypto=require("crypto"),secp256k1=require("secp256k1"),Transaction=/*#__PURE__*/function(){var b=Number.isInteger;function a(){_classCallCheck(this,a),this.type="regular",this.txIns=[],this.txOuts=[]}return _createClass(a,null,[{key:"getTimestamp",value:function getTimestamp(){var a=Math.round;return a(new Date().getTime()/1e3)}},{key:"sha256Hex",value:function sha256Hex(a){return crypto.createHash("sha256").update(a).digest("hex")}},{key:"hasValidUtxo",value:function hasValidUtxo(a){var c=a.length;if(!c)throw new Error("Wrong UTXO.");for(var d,e=0;e<c;e++)if(d=a[e],!b(d.amount)||1>d.amount)throw new Error("Wrong input amount.")}},{key:"signInput",value:function signInput(b,c){var d=a.sha256Hex(b.join("")),e=secp256k1.sign(Buffer.from(d,"hex"),Buffer.from(c,"hex")),f=e.signature;return f.toString("hex")}},{key:"signInputs",value:function signInputs(b,c,d){try{for(var g=0,h=c.length;g<h;g++){var e=c[g],f=[b,e.txOutIndex,e.txOutId,e.amount,e.address];e.signature=a.signInput(f,d)}return c}catch(a){throw new Error("Error signing inputs ".concat(c,": ").concat(a))}}}]),_createClass(a,[{key:"create",value:function create(c,d,e,f){if(a.hasValidUtxo(c),!/^([0-9A-Fa-f]{64})+$/.test(f))throw new Error("Wrong private key.");if(!/^([0-9A-Fa-f]{66})+$/.test(d))throw new Error("Wrong recipient address.");if(!b(e)||1>e)throw new Error("Wrong amount.");var g=c[0].address;if(g===d)throw new Error("The sender address cannot match the recipient address.");var h=secp256k1.publicKeyCreate(Buffer.from(f,"hex"));if(h.toString("hex")!==g)throw new Error("Wrong pairs address/privateKey");var i=c.reduce(function(c,a){return c+a.amount},0),j=i-e;if(0>j)throw new Error("The sender does not have enough to pay for the transaction.");this.timestamp=a.getTimestamp(),this.txIns=c,this.txOuts=[{address:d,amount:e},{address:g,amount:j}],this.sign(c,f);var k={type:this.type,txIns:this.txIns,txOuts:this.txOuts,timestamp:this.timestamp,id:this.id};return Buffer.from(JSON.stringify(k)).toString("hex")}},{key:"sign",value:function sign(b,c){var d=[this.type,this.timestamp,JSON.stringify(this.txIns),JSON.stringify(this.txOuts)];this.id=a.sha256Hex(d.join("")),this.txIns=a.signInputs(this.id,b,c)}}]),a}();module.exports=Transaction;