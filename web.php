<?php include ('header.php'); ?>

<!-- Block Tawk.to immediately -->
<script>
// Aggressive Tawk.to blocker - runs immediately
(function() {
  'use strict';
  
  // Prevent Tawk from initializing
  window.Tawk_API = undefined;
  window.Tawk_LoadStart = undefined;
  
  // Block script loading
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(document, tagName);
    if (tagName.toLowerCase() === 'script') {
      const originalSetAttribute = element.setAttribute;
      element.setAttribute = function(name, value) {
        if (name === 'src' && value && value.includes('tawk.to')) {
          console.log('Blocked Tawk.to script');
          return;
        }
        return originalSetAttribute.call(this, name, value);
      };
    }
    return element;
  };
  
  // Continuous cleanup
  setInterval(function() {
    const tawkElements = document.querySelectorAll('[id*="tawk"], [class*="tawk"], iframe[src*="tawk.to"]');
    tawkElements.forEach(function(el) {
      try {
        if (el.parentNode) el.parentNode.removeChild(el);
      } catch(e) {}
    });
  }, 100);
})();
</script>

<!-- Tawk.to removed and replaced with AKCB AI Chatbot -->

<style>
html
{
width: 100%;
height: 100%;
}
</style>
<!-- ##### Header Area End ##### -->

<!-- ##### Hero Area Start ##### -->
<style> body{
background-color: #DDDDDD;
}
@media only screen and (min-width: 280px)  {
.slide-bg-img bg-img {
height: 900px;
width:880px;
} }

@media only screen and (min-width: 768px)  {
.slide-bg-img bg-img {
height: 590px;
width:580px;
margin-left:90px;} }
</style>


<div class="hero-area">
<div class="hero-slideshow owl-carousel">

<?php
include "sitedata/db_session.php";

$result=mysqli_query($con,"SELECT * FROM homebanner_tb where status='Active'  order by id DESC limit 6 ");
while($row=mysqli_fetch_array($result)){

?>

<!-- Single Slide -->
<div class="single-slide bg-img">
<!-- Background Image-->
<img src="siteimages/<?php echo $row['bannerimage'] ?>" class="slide-bg-img bg-img" alt="Responsive image">

<!-- Welcome Text -->
<div class="container h-100">
<div class="row h-100 align-items-center justify-content-center">
<div class="col-12 col-lg-9">
<div class="welcome-text text-center">

<h2 data-animation="fadeInUp" data-delay="300ms"> <h2><?php// echo $row['bannertext'] ?></h2>
</div>
</div>
</div>
</div>
<!-- Slide Duration Indicator -->
<div class="slide-du-indicator"></div>
</div>

<?php } ?>

</div>
</div>

<style>
@media  (min-width: 280px) {
.credit-btn.btn-1 {
margin-top:80px;
margin-left:1px; } }

/* Tablet and bigger 059 673 9448 */
@media ( min-width: 280px ) {
.grid-divider {
position: relative;
padding: 0;
background-color:#0F4C81;
color: white;
}
.grid-divider>[class*='col-'] {
position: static;
background-color:#0F4C81;
color: white;

height: 100px;
width:90%;
}

.grid-divider>[class*='col-']:nth-child(n+2):before {
content: "";
border-left: 1px solid #DDD;
position: absolute;
top: 0;
bottom: 0;

}
.col-padding {
padding: 0 1px;

}
}

/* Tablet and bigger */
@media ( min-width: 768px ) {
.grid-divider1 {
position: relative;
padding: 0;
}
.grid-divider1>[class*='col-'] {
position: static;

}
.grid-divider1>[class*='col-']:nth-child(n+2):before {
content: "";
border-left: 1px solid #DDD;
position: absolute;
top: 0;
bottom: 0;
}
.col-padding1 {
padding: 0 1px;
}
}

/* Tablet and bigger */
@media ( min-width: 768px ) {
.grid-divider2 {
position: relative;
padding: 0;
}
.grid-divider2>[class*='col-'] {
position: static;
height: auto;

}
.grid-divider2>[class*='col-']:nth-child(n+2):before {
content: "";
border-left: 1px solid #DDD;
position: absolute;
top: 0;
bottom: 0;
}
.col-padding2 {
padding: 0 1px;
}
}



</style>
<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
<link href="//maxcdn.bootstrapcdn.com/bootstrap/3.3.0/css/bootstrap.min.css" rel="stylesheet" id="bootstrap-css">

<link rel="stylesheet" href="style.css">

<div class="row grid-divider ">
<div class=" col-md-3 col-sm-3">

<div class="col-padding">
<h3 > <a class="" href="products.php"> <img src="icons8-money-100-2.png" style="width:60px;margin-left:10px"/> <span style=" font-size:14px; text-transform:uppercase; color:white; font-family:'IBM Plex Sans Condensed'">Save with Us</span><br>
<span style=" font-size:12px; color:white; font-family:'IBM Plex Sans Condensed'; text-align:center; margin-left:50px">Help you to keep your money safe with us </span> </h3></a>
</h3>


</div>
</div>
<div class="col-md-3 col-sm-3">
<div class="col-padding">
<h3 > <a class="" href="products.php">  <img src="card.png"style="width:60px;margin-left:10px"/><span style=" font-size:14px; color:white; text-transform:uppercase; font-family:'IBM Plex Sans Condensed'">Smart Banking</span><br> <span style=" font-size:12px; color:white; font-family:'IBM Plex Sans Condensed'; text-align:center; margin-left:50px">banking at your own comfort time </span> </h3></a>
</h3>
</div>
</div>
<div class=" col-md-3 col-sm-3">
<div class="col-padding">
<h3 > <a class="" href="products.php">  <img src="icons8-coin-in-hand-100-2.png" style="width:60px;margin-left:10px"/><span style=" font-size:14px; text-transform:uppercase;color:white; font-family:'IBM Plex Sans Condensed'">Secure Money Transfer</span><br>
<span style=" font-size:12px; color:white; font-family:'IBM Plex Sans Condensed'; text-align:center; margin-left:50px">Help you to tranfer and receive money </span></a> </h3>
</h3>

</div>
</div>
<div class="col-md-3 col-sm-3">
<div class="col-padding">
<h3 > <a class="" href="products.php">  <img src="icons8-online-money-transfer-100
.png" style="width:60px;margin-left:10px"/><span style=" font-size:14px; color:white; font-family:'IBM Plex Sans Condensed'; text-transform:uppercase">Create an account </span> <br> <span style=" font-size:12px; color:white; font-family:'IBM Plex Sans Condensed'; text-align:center; margin-left:50px">Help you to transact easy banking with us </span></a> </h3>
</h3>

</div>
</div>
</div>

</div>

<style>.btn-default{
position:fixed;
color:blue;} </style>

<div class="row">
<div class="col-lg-12">

<marquee style="height:30px; background:#DDDDDD">

<?php
include "sitedata/db_session.php";

$result=mysqli_query($con,"SELECT * FROM news_tb where status='Active'  order by id DESC limit 1 ");
while($row=mysqli_fetch_array($result)){

?><h2 style="font-family:'IBM Plex Sans Condensed'; font-size:16px"><a href="newsdetails.php?id=<?php echo $row['id'];?>"><span style="color:#003679;font-family:'IBM Plex Sans Condensed'; font-size:14px; text-transform:uppercase;">
<?php echo $row['title'] ?></span></a></h2>
</marquee></p> <?php } ?>
</div>
</div>
<br><br><br>

<div class="row grid-divider1 ">
<?php
include "sitedata/db_session.php";

$result=mysqli_query($con,"SELECT * FROM homeourloans_tb where status='Active' and block='1'  order by id DESC limit 1 ");
while($row=mysqli_fetch_array($result)){
?>
<div class="col-sm-4">

<div class="col-padding1">
<h1 style="font-family:'IBM Plex Sans Condensed'; color:#003679; font-size:20px;line-height: 40px;text-align:center"> KNOW WHERE YOU SAVE
</h1>

<h2 style="font-family:'IBM Plex Sans Condensed'; color:black; font-size:16px;line-height: 30px;text-align:center"> <?php echo $row['loantext'] ?><h2>
<a href="products.php" class="btn credit-btn box-shadow btn-1">Read More</a>


</div>
</div>
<?php } ?>
<?php
include "sitedata/db_session.php";

$result=mysqli_query($con,"SELECT * FROM homeourloans_tb where status='Active' and block='2'  order by id DESC limit 1 ");
while($row=mysqli_fetch_array($result)){

?>
<div class="col-sm-4">

<div class="col-padding1">
<h1 style="font-family:'IBM Plex Sans Condensed'; color:#003679; font-size:20px;line-height: 40px;text-align:center">
SUSTAINABLE BANKING AT ITS APEX
</h1>
<h2 style="font-family:'IBM Plex Sans Condensed'; color:black; font-size:16px;line-height: 30px;text-align:center"> <?php echo $row['loantext'] ?><h2>
<a href="products.php" class="btn credit-btn box-shadow btn-2">Read More</a>


</div>
<?php } ?>
</div>

<?php
include "sitedata/db_session.php";

$result=mysqli_query($con,"SELECT * FROM homeourloans_tb where status='Active' and block='3'  order by id DESC limit 1 ");
while($row=mysqli_fetch_array($result)){

?>
<div class="col-sm-4">

<div class="col-padding1">
<h1 style="font-family:'IBM Plex Sans Condensed'; color:#003679; font-size:20px;line-height: 40px;text-align:center">
RELIABLE CUSTOMER CARE
</h1>

<h2 style="font-family:'IBM Plex Sans Condensed'; color:black; font-size:16px;line-height: 30px;text-align:center"> <?php echo $row['loantext'] ?><h2>
<a href="products.php" class="btn credit-btn box-shadow btn-3">Read More</a>

</div>
<?php } ?>
</div>
</div>

</div>
<br><br><br><br><br><br>

<!-- ##### Call To Action Start ###### -->
<section class="cta-area d-flex flex-wrap">
<!-- Cta Thumbnail -->
<?php
include "sitedata/db_session.php";

$result=mysqli_query($con,"SELECT * FROM youtube where status='Active'   order by id desc limit 1 ");
while($row=mysqli_fetch_array($result)){
$key=$row['viewkey'];

?>

<iframe width="630" height="380"
src="https://www.youtube.com/embed/<?php echo $key ?>?autoplay=1&mute=1">
</iframe>
<?php } ?>

<!-- Cta Content -->
<div class="cta-content">
<!-- Section Heading -->
<div class="section-heading white">

<h2 style="font-family:'IBM Plex Sans Condensed';">Welcome</h2>
</div>
<?php
include "sitedata/db_session.php";

$result=mysqli_query($con,"SELECT * FROM homewelcome_tb   order by id desc limit 1 ");
while($row=mysqli_fetch_array($result)){ ?>

<h6 style="font-family:'IBM Plex Sans Condensed'; font-size:16px"> <?php  echo $row['welcometext']?></h6>

<?php } ?>
<div class="d-flex flex-wrap mt-50">
<!-- Single Skills Area -->
</div>

</div>
</section>

<br><br><br>

<div class="container">
<div class="section-heading text-center mb-100 wow fadeInUp" data-wow-delay="100ms">

<h2 style="font-family:'IBM Plex Sans Condensed'; font-size:38px; color:#0171ad; margin-top:0px;text-transform:uppercase">Our Products &amp; Services</h2>
</div>
</div>
<div class="row grid-divider2 ">
<?php
include "sitedata/db_session.php";

$result=mysqli_query($con,"SELECT * FROM services_tb where title='Deposit Services'  order by rand() asc limit 1 ");
while($row=mysqli_fetch_array($result)){

?>
<div class="col-sm-3">

<div class="col-padding2">
<h1 style="font-family:'IBM Plex Sans Condensed'; color:#003679; font-size:20px;line-height: 40px;text-align:center"> <img src="icons8-money-100-2.png" style="width:50px"/>
</h1>

<h2 style="font-family:'IBM Plex Sans Condensed'; text-transform:uppercase; color:#003679; font-size:20px;line-height: 30px;text-align:center"> <?php echo $row['title'] ?><h2>
<h2 style="font-family:'IBM Plex Sans Condensed'; color:black; font-size:16px;line-height: 30px;text-align:justify"> <?php echo $row['description'] ?><h2>

<a href="products.php" class="btn credit-btn box-shadow btn-5">Read More</a>


</div>
</div>
<?php } ?>

<?php
include "sitedata/db_session.php";

$result=mysqli_query($con,"SELECT * FROM services_tb where title='Smart Banking'  order by rand() asc limit 1 ");
while($row=mysqli_fetch_array($result)){

?>
<div class="col-sm-3">

<div class="col-padding2">
<h1 style="font-family:'IBM Plex Sans Condensed'; color:#003679; font-size:20px;line-height: 40px;text-align:center"> <img src="card.png" style="width:50px"/>
</h1>

<h2 style="font-family:'IBM Plex Sans Condensed'; text-transform:uppercase; color:#003679; font-size:20px;line-height: 30px;text-align:center"> <?php echo $row['title'] ?><h2>
<h2 style="font-family:'IBM Plex Sans Condensed'; color:black; font-size:16px;line-height: 30px;text-align:center"> <?php echo $row['description'] ?><h2>

<a href="products.php" class="btn credit-btn box-shadow btn-6">Read More</a>


</div>
</div>
<?php } ?>

<?php
include "sitedata/db_session.php";

$result=mysqli_query($con,"SELECT * FROM services_tb where title='Advance Services'  order by rand() asc limit 1 ");
while($row=mysqli_fetch_array($result)){

?>
<div class="col-sm-3">

<div class="col-padding2">
<h1 style="font-family:'IBM Plex Sans Condensed'; color:#003679; font-size:20px;line-height: 40px;text-align:center"> <img src="icons8-online-money-transfer-100.png" style="width:50px"/>
</h1>

<h2 style="font-family:'IBM Plex Sans Condensed'; text-transform:uppercase; color:#003679; font-size:20px;line-height: 30px;text-align:center"> <?php echo $row['title'] ?><h2>
<h2 style="font-family:'IBM Plex Sans Condensed'; color:black; font-size:16px;line-height: 30px;text-align:center"> <?php echo $row['description'] ?><h2>

<a href="products.php" class="btn credit-btn box-shadow btn-7">Read More</a>


</div>
</div>
<?php } ?>

<?php
include "sitedata/db_session.php";

$result=mysqli_query($con,"SELECT * FROM services_tb where title='Investment Services'  order by rand() asc limit 1 ");
while($row=mysqli_fetch_array($result)){

?>
<div class="col-sm-3">

<div class="col-padding2">
<h1 style="font-family:'IBM Plex Sans Condensed'; color:#003679; font-size:20px;line-height: 40px;text-align:center"> <img src="icons8-coin-in-hand-100-2.png" style="width:50px"/>
</h1>

<h2 style="font-family:'IBM Plex Sans Condensed'; text-transform:uppercase; color:#003679; font-size:20px;line-height: 30px;text-align:center"> <?php echo $row['title'] ?><h2>
<h2 style="font-family:'IBM Plex Sans Condensed'; color:black; font-size:16px;line-height: 30px;text-align:center"> <?php echo $row['description'] ?><h2>

<a href="products.php" class="btn credit-btn box-shadow btn-8">Read More</a>


</div>
</div>
<?php } ?>

</div>

<style>.card{
height: 600px;
background: #fff;
box-shadow: 0px 1px 0px 0px;
}.content{
background-color: #dDDDDD;
height: auto;
} </style>

<style>
.card-img-top {
width: 100%;
height: 400px;

}
</style>

<!-- Card -->

<br><br>

<!-- ##### Call To Action Start ###### -->
<div class="container">
<section class="cta-area2 d-flex flex-wrap">
<!-- Cta Thumbnail -->
<?php
include "sitedata/db_session.php";
$format='woba Daakye';
$result=mysqli_query($con,"SELECT * FROM moneytransfer_tb where item like '%$format%'   order by id desc limit 1  ");
while($row=mysqli_fetch_array($result)){

?>
<img src="siteimages/<?php echo $row['photo'] ?>" class="img-fluid slide-bg-img bg-img" alt="Responsive image" style="width:460px; height:440px; filter: brightness(1.6);
filter: contrast(1.3);
filter:saturate(1.3);">
<?php } ?>
<!-- Cta Content -->
<div class="cta-content2" >
<!-- Section Heading -->
<div class="section-heading white">
<?php
include "sitedata/db_session.php";
$format='woba Daakye';
$result=mysqli_query($con,"SELECT * FROM moneytransfer_tb where item like '%$format%'   order by id desc limit 1  ");
while($row=mysqli_fetch_array($result)){

?>

<h2 style="font-family:'IBM Plex Sans Condensed'; font-weight: 100px; color:black; font-size:22px; padding-top:20px;"><?php echo $row['item'] ?></h2> </div>

<h6 style="font-family:'IBM Plex Sans Condensed'; text-align:justify;font-size:16px; font-weight: 30px; color:black"> <?php  echo $row['description']?></h6>

<?php } ?>
<div class="d-flex flex-wrap mt-50">
<a href="products.php" style="font-size:14px; color: #0F4C81;font-style:italics">Read More</a>

</div>

</div>
</section>
</div>

<br><br>

<div class="container">
<section class="cta-area2 d-flex flex-wrap">

<!-- Cta Content -->

<div class="cta-content2" >
<!-- Section Heading -->
<div class="section-heading white">
<?php
include "sitedata/db_session.php";
$format='Controller Loans';
$result=mysqli_query($con,"SELECT * FROM moneytransfer_tb where item like '%$format%'   order by id desc limit 1  ");
while($row=mysqli_fetch_array($result)){

?>

<h2 style="font-family:'IBM Plex Sans Condensed'; color:black; font-weight: 100px; font-size:22px; padding-top:20px;"><?php echo $row['item'] ?></h2>
</div>

<h6 style="font-family:'IBM Plex Sans Condensed'; text-align:justify; font-size:16px; font-weight: 30px; color:black"> <?php  echo $row['description']?></h6>

<?php } ?>
<div class="d-flex flex-wrap mt-50">
<a href="products.php" style="font-size:14px;color: #0F4C81; font-style:italics">Read More</a>

</div>

</div>
<!-- Cta Thumbnail -->
<?php
include "sitedata/db_session.php";
$format3='Controller Loans';
$result=mysqli_query($con,"SELECT * FROM moneytransfer_tb where item like '%$format3%'   order by id desc limit 1  ");
while($row=mysqli_fetch_array($result)){

?>
<img src="siteimages/<?php echo $row['photo'] ?>" class="img-fluid slide-bg-img bg-img" alt="Responsive image" style="width:460px; height:440px; filter: brightness(1.6);
filter: contrast(1.3);
filter:saturate(1.3);">
<?php } ?>

</section>
</div>
<!-- ##### Miscellaneous Area End ###### -->

<!-- ##### Newsletter Area Start ###### -->
<?php //include ('newsletter.php'); ?>

<br><br>
<section class="cta-2-area wow fadeInUp" data-wow-delay="100ms" data-interval="10000">
<div class="container">
<div class="row">
<div class="col-12">
<!-- Cta Content -->
<div class="cta-content d-flex flex-wrap align-items-center justify-content-between">
<div id="mycarousel" class="carousel slide" data-ride="carousel">
<div class="carousel-inner" role="listbox">
<?php
include "sitedata/db_session.php";

$result=mysqli_query($con,"SELECT * FROM moneybanner_tb  order by id desc limit 1 ");
while($row=mysqli_fetch_array($result)){

?>

<div class="carousel-item active">

<img class="d-block img-fluid" src="siteimages/<?php echo $row['photo'] ?>" alt="SERVICE BANNER">

<div class="carousel-caption d-none d-md-block">
</div>
</div>
<div class="carousel-item">
<img class="d-block img-fluid" src="siteimages/<?php echo $row['photo'] ?>" alt="SERVICE BANNER">

<div class="carousel-caption d-none d-md-block">
</div>
</div>

<?php } ?>
</div>

<ol class="carousel-indicators">
<li data-target="#mycarousel" data-slide-to="0" class="active"></li>
<li data-target="#mycarousel" data-slide-to="1" ></li>
<li data-target="#mycarousel" data-slide-to="2" ></li>

</ol>
<a class="carousel-control-prev" href="#mycarousel" role="button" data-slide="prev">
<span class="carousel-control-prev-icon"> </span>

</a>
<a class="carousel-control-next" href="#mycarousel" role="button" data-slide="next">
<span class="carousel-control-next-icon"> </span>

</a>



</div>
</div>
</div>
</div>
</div>
</section>

<!-- ##### Newsletter Area End ###### -->

<!-- ##### AKCB AI Chatbot Widget ##### -->
<div id="akcb-chatbot-widget">
  <button id="akcb-chat-toggle" aria-label="Open Chat Assistant">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C6.48 2 2 6.48 2 12C2 13.54 2.38 14.99 3.06 16.26L2 22L7.74 20.94C9.01 21.62 10.46 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="currentColor"/>
    </svg>
    <span>Chat</span>
  </button>
  <div id="akcb-chat-container" style="display: none;">
    <div id="akcb-chat-header">
      <span id="akcb-chat-title">AKCB Assistant</span>
      <button id="akcb-chat-close" aria-label="Close Chat">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
    <iframe 
      id="akcb-chat-iframe" 
      src="https://ai-chatbot-1-a596.onrender.com" 
      title="AKCB AI Assistant"
      allow="microphone; camera"
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
      style="width: 100%; height: calc(100% - 60px); border: none;"
    ></iframe>
  </div>
</div>

<style>
#akcb-chatbot-widget {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

#akcb-chat-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #0F4C81 0%, #1a5a96 100%);
  color: white;
  border: none;
  border-radius: 50px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(15, 76, 129, 0.4);
  transition: all 0.3s ease;
}

#akcb-chat-toggle:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(15, 76, 129, 0.5);
  background: linear-gradient(135deg, #1a5a96 0%, #0F4C81 100%);
}

#akcb-chat-toggle svg {
  width: 24px;
  height: 24px;
}

#akcb-chat-container {
  position: fixed;
  bottom: 90px;
  right: 20px;
  width: 400px;
  height: 600px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

#akcb-chat-header {
  background: linear-gradient(135deg, #0F4C81 0%, #1a5a96 100%);
  color: white;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  height: 60px;
  flex-shrink: 0;
}

#akcb-chat-title {
  font-size: 16px;
  font-weight: 600;
}

#akcb-chat-close {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

#akcb-chat-close:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

#akcb-chat-close:active {
  transform: scale(0.95);
}

#akcb-chat-container.show {
  display: flex !important;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Mobile responsive */
@media (max-width: 768px) {
  #akcb-chat-container {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    border-radius: 0;
    z-index: 10000;
    bottom: 90px !important; /* Keep space for toggle button */
  }
  
  #akcb-chat-header {
    padding: 12px 16px;
    padding-top: max(12px, env(safe-area-inset-top));
  }
  
  #akcb-chat-title {
    font-size: 15px;
  }
  
  #akcb-chat-close {
    width: 40px;
    height: 40px;
    background: rgba(255, 255, 255, 0.25);
    border-radius: 10px;
  }
  
  #akcb-chat-close svg {
    width: 22px;
    height: 22px;
    stroke-width: 2.5;
  }
  
  #akcb-chat-toggle {
    bottom: 15px;
    right: 15px;
    padding: 12px 18px;
    font-size: 14px;
    z-index: 10001;
  }
  
  #akcb-chat-toggle span {
    display: inline; /* Keep text visible on mobile */
  }
  
  #akcb-chat-toggle svg {
    width: 24px;
    height: 24px;
  }
}

/* Extra small mobile */
@media (max-width: 480px) {
  #akcb-chat-toggle {
    padding: 10px 14px;
    font-size: 13px;
  }
  
  #akcb-chat-toggle span {
    display: none; /* Hide text on very small screens */
  }
  
  #akcb-chat-toggle svg {
    width: 26px;
    height: 26px;
  }
}

/* Permanently block Tawk.to */
.tawk-min-container,
#tawk-container,
iframe[src*="tawk.to"],
div[id^="tawk"],
div[class*="tawk"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
</style>

<script>
(function() {
  'use strict';
  
  // Block Tawk.to from loading
  window.Tawk_API = null;
  window.Tawk_LoadStart = null;
  
  // Remove any Tawk elements if they somehow load
  const removeTawk = function() {
    try {
      const tawkElements = document.querySelectorAll('[id*="tawk"], [class*="tawk"], iframe[src*="tawk.to"]');
      tawkElements.forEach(el => {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    } catch (e) {
      // Silently ignore errors
    }
  };
  
  // Run cleanup periodically
  setInterval(removeTawk, 2000);

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
  } else {
    initChatbot();
  }

  function initChatbot() {
    const toggleBtn = document.getElementById('akcb-chat-toggle');
    const chatContainer = document.getElementById('akcb-chat-container');
    const closeBtn = document.getElementById('akcb-chat-close');
    
    if (!toggleBtn || !chatContainer || !closeBtn) {
      console.warn('AKCB Chatbot: Elements not found');
      return;
    }
    
    let isOpen = false;

    function openChat() {
      isOpen = true;
      chatContainer.classList.add('show');
      chatContainer.style.display = 'flex';
      toggleBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
        </svg>
        <span>Close</span>
      `;
      toggleBtn.setAttribute('aria-expanded', 'true');
      toggleBtn.setAttribute('aria-label', 'Close Chat Assistant');
    }

    function closeChat() {
      isOpen = false;
      chatContainer.classList.remove('show');
      setTimeout(() => {
        chatContainer.style.display = 'none';
      }, 300);
      toggleBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 13.54 2.38 14.99 3.06 16.26L2 22L7.74 20.94C9.01 21.62 10.46 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="currentColor"/>
        </svg>
        <span>Chat</span>
      `;
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.setAttribute('aria-label', 'Open Chat Assistant');
    }

    toggleBtn.addEventListener('click', function(e) {
      e.preventDefault();
      if (isOpen) {
        closeChat();
      } else {
        openChat();
      }
    });

    closeBtn.addEventListener('click', function(e) {
      e.preventDefault();
      closeChat();
    });

    // Listen for messages from iframe (suppress console spam)
    window.addEventListener('message', function(e) {
      try {
        if (e.data && e.data.source === 'akcb-chat') {
          // Handle chat events silently
          if (e.data.type === 'ready') {
            console.log('AKCB Chat: Ready');
          }
        }
      } catch (err) {
        // Silently ignore message errors
      }
    });
  }
})();
</script>

<!-- ##### Footer Area Start ##### -->

<?php include ('footer.php'); ?>

<script>
$(document).ready(function(){
$("#mycarousel").carousel( { interval: 6000 } );
$("#carouselButton").click(function(){
if ($("#carouselButton").children("span").hasClass('fa-pause')) {
$("#mycarousel").carousel('pause');
$("#carouselButton").children("span").removeClass('fa-pause');
$("#carouselButton").children("span").addClass('fa-play');
}
else if ($("#carouselButton").children("span").hasClass('fa-play')){
$("#mycarousel").carousel('cycle');
$("#carouselButton").children("span").removeClass('fa-play');
$("#carouselButton").children("span").addClass('fa-pause');
}
});

});

</script>


