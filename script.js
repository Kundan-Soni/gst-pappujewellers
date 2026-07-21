let items = [];
let totalAmount = 0;

let itemImage1Data = null;
let itemImage2Data = null;

/* ADD ITEM */
// function addItem() {

// const desc = document.getElementById("desc").value;
// const weight = document.getElementById("weight").value;
// const rate = document.getElementById("rate").value;
// const total = Number(document.getElementById("total").value);

// if (!desc || !weight || !rate || total <= 0) {
// alert("Enter all item details");
// return;
// }

// totalAmount += total;

// items.push([desc, weight, rate, total.toFixed(2)]);

// document.getElementById("billBody").innerHTML += `
// <tr>
// <td>${desc}</td>
// <td>${weight}</td>
// <td>${rate}</td>
// <td>${total.toFixed(2)}</td>
// </tr>
// `;

// document.getElementById("grandTotal").innerText =
// "Total : ₹" + totalAmount.toFixed(2);

// document.getElementById("desc").value="";
// document.getElementById("weight").value="";
// document.getElementById("rate").value="";
// document.getElementById("total").value="";
// }

function addItem(){

let desc=document.getElementById("desc").value;
let weight=parseFloat(document.getElementById("weight").value);
let rate=parseFloat(document.getElementById("rate").value);
let making=parseFloat(document.getElementById("making").value);

if(!desc || isNaN(weight) || isNaN(rate) || isNaN(making)){
    alert("Please fill all fields");
    return;
}

let value=weight*rate;

let taxable=value+making;

let cgst=taxable*0.015;

let sgst=taxable*0.015;

let total=taxable+cgst+sgst;

totalAmount+=total;

items.push([
desc,
weight.toFixed(3),
rate.toFixed(2),
making.toFixed(2),
value.toFixed(2),
cgst.toFixed(2),
sgst.toFixed(2),
total.toFixed(2)
]);

document.getElementById("billBody").innerHTML+=`

<tr>

<td>${desc}</td>

<td>${weight.toFixed(3)}</td>

<td>${rate.toFixed(2)}</td>

<td>${making.toFixed(2)}</td>

<td>${value.toFixed(2)}</td>

<td>${cgst.toFixed(2)}</td>

<td>${sgst.toFixed(2)}</td>

<td>${total.toFixed(2)}</td>

</tr>

`;

document.getElementById("grandTotal").innerHTML=
"Grand Total : ₹"+totalAmount.toFixed(2);

document.getElementById("desc").value="";
document.getElementById("weight").value="";
document.getElementById("rate").value="";
document.getElementById("making").value="";

}

/* IMAGE UPLOAD */
function loadImage(id, cb){
document.getElementById(id).addEventListener("change",function(e){

const file=e.target.files[0];
if(!file) return;

const reader=new FileReader();
reader.onload=()=>cb(reader.result);
reader.readAsDataURL(file);

});
}

loadImage("itemImage1",d=>itemImage1Data=d);
loadImage("itemImage2",d=>itemImage2Data=d);

/* NUMBER TO WORDS */
function numberToWords(num){

const a=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
"Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen",
"Seventeen","Eighteen","Nineteen"];

const b=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];

function convert(n){
if(n<20) return a[n];
if(n<100) return b[Math.floor(n/10)]+" "+a[n%10];
if(n<1000) return a[Math.floor(n/100)]+" Hundred "+convert(n%100);
if(n<100000) return convert(Math.floor(n/1000))+" Thousand "+convert(n%1000);
if(n<10000000) return convert(Math.floor(n/100000))+" Lakh "+convert(n%100000);
return convert(Math.floor(n/10000000))+" Crore "+convert(n%10000000);
}

return convert(num)+" Only";
}

/* GENERATE PDF */
function generatePDF(){

if(items.length===0){
alert("No items added");
return;
}

const {jsPDF}=window.jspdf;
const doc=new jsPDF();

const headerImg=new Image();
headerImg.src="header.png";

headerImg.onload=function(){

doc.addImage(headerImg,"PNG",5,5,200,40);

/* CUSTOMER INFO */

doc.setFontSize(10);

doc.text("Name :",14,55);
doc.text(document.getElementById("custName").value||"",35,55);

doc.text("Add :",14,62);
doc.text(document.getElementById("custAddress").value||"",35,62);

doc.text("Date : "+(document.getElementById("billDate").value||""),200,55,{align:"right"});

doc.text("Mobile : "+(document.getElementById("custMobile").value||""),200,62,{align:"right"});

/* TABLE */

const tableData=[...items];
tableData.push(["","","Grand Total",totalAmount.toFixed(2)]);

doc.autoTable({
startY:72,
// head:[["Description","Weight","Rate","Total"]],
head:[[
"Description",
"Weight",
"Rate",
"Making",
"Value",
"CGST",
"SGST",
"Total"
]]
body:tableData
});

let y=doc.lastAutoTable.finalY+10;

/* ITEM PHOTOS */

if(itemImage1Data){
doc.addImage(itemImage1Data,"JPEG",14,y,80,60);
}

if(itemImage2Data){
doc.addImage(itemImage2Data,"JPEG",110,y,80,60);
}

y+=70;

/*TAX SUMMARY*/
doc.text("Tax Summary",14,currentY);

currentY+=8;

doc.text("CGST (1.5%) : ₹"+totalCGST.toFixed(2),14,currentY);

currentY+=6;

doc.text("SGST (1.5%) : ₹"+totalSGST.toFixed(2),14,currentY);

currentY+=6;

doc.text("Grand Total : ₹"+totalAmount.toFixed(2),14,currentY);

/* TOTAL WORDS */

doc.text(
"Total Amount (in words): "+numberToWords(totalAmount),
14,
y
);

y+=15;

/* GENERATE UPI QR */
const qrImg=new Image();
qrImg.src="upi.png";

qrImg.onload=function(){

doc.addImage(qrImg,"PNG",150,y-10,40,40);

// const upi="upi://pay?pa=kundan@upi&pn=Kundan%20Jewellers&am="+totalAmount+"&cu=INR";

// QRCode.toDataURL(upi,function(err,url){

// doc.addImage(url,"PNG",150,y-10,40,40);

/* TERMS */

doc.setFontSize(9);

doc.text("Terms & Conditions:",14,y);
doc.text("Goods once sold will not be taken back.",14,y+6);
doc.text("Subject to Glittering City jurisdiction.",14,y+12);
doc.text("Thank you for shopping with us!",14,y+20);

doc.save("GST_Invoice_Kundan_Jewellers.pdf");

};

};
}