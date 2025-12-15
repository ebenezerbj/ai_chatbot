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

<!-- ##### AKCB AI Chatbot Widget - Modern Design ##### -->
<div id="akcb-chatbot-widget">
  <!-- Welcome Tooltip -->
  <div id="akcb-welcome-tooltip" style="display: none;">
    <div class="akcb-tooltip-arrow"></div>
    <div class="akcb-tooltip-content">
      <div class="akcb-tooltip-header">
        <span class="akcb-wave-emoji">👋</span>
        <strong>Hi! I'm AMA</strong>
      </div>
      <p>Your 24/7 Banking Assistant</p>
      <div class="akcb-tooltip-cta">Click to start chatting!</div>
    </div>
  </div>
  
  <!-- Chat Toggle Button (FAB) -->
  <button id="akcb-chat-toggle" class="akcb-fab" aria-label="Chat with AMA">
    <div class="akcb-fab-content">
      <div class="akcb-fab-icon akcb-chat-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
          <circle cx="12" cy="10" r="1.5" fill="white"/>
          <circle cx="8" cy="10" r="1.5" fill="white"/>
          <circle cx="16" cy="10" r="1.5" fill="white"/>
        </svg>
      </div>
      <div class="akcb-fab-icon akcb-close-icon" style="display: none;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </div>
      <span class="akcb-online-badge"></span>
    </div>
    <span class="akcb-ripple"></span>
  </button>
  
  <!-- Chat Window -->
  <div id="akcb-chat-window" style="display: none;">
    <div class="akcb-chat-header">
      <div class="akcb-header-info">
        <div class="akcb-header-avatar">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
          </svg>
          <span class="akcb-avatar-status"></span>
        </div>
        <div class="akcb-header-text">
          <div class="akcb-header-name">AMA</div>
          <div class="akcb-header-status">Banking Assistant • Online</div>
        </div>
      </div>
      <button id="akcb-chat-close" class="akcb-close-btn" aria-label="Close chat">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>
    
    <div class="akcb-chat-body">
      <iframe 
        id="akcb-chat-iframe" 
        src="https://ai-chatbot-1-a596.onrender.com" 
        title="AKCB AI Assistant"
        allow="microphone; camera"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
      ></iframe>
    </div>
  </div>
</div>

<style>
/* ===== AKCB Chatbot Widget - Modern Material Design ===== */

/* Animations */
@keyframes akcb-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(0, 191, 165, 0.7);
  }
  70% {
    box-shadow: 0 0 0 20px rgba(0, 191, 165, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(0, 191, 165, 0);
  }
}

@keyframes akcb-ripple {
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}

@keyframes akcb-slideUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes akcb-fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes akcb-bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-8px);
  }
  60% {
    transform: translateY(-4px);
  }
}

/* Widget Container */
#akcb-chatbot-widget {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 999999;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* Welcome Tooltip */
#akcb-welcome-tooltip {
  position: absolute;
  bottom: 90px;
  right: 0;
  background: white;
  border-radius: 16px;
  padding: 18px 22px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  min-width: 280px;
  max-width: 320px;
  animation: akcb-slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1), akcb-bounce 2s ease-in-out 0.5s infinite;
  border: 1px solid rgba(0, 191, 165, 0.2);
}

.akcb-tooltip-arrow {
  position: absolute;
  bottom: -8px;
  right: 30px;
  width: 16px;
  height: 16px;
  background: white;
  border-right: 1px solid rgba(0, 191, 165, 0.2);
  border-bottom: 1px solid rgba(0, 191, 165, 0.2);
  transform: rotate(45deg);
}

.akcb-tooltip-content {
  position: relative;
  z-index: 1;
}

.akcb-tooltip-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.akcb-wave-emoji {
  font-size: 24px;
  display: inline-block;
  animation: wave 0.6s ease-in-out infinite alternate;
}

@keyframes wave {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(20deg);
  }
}

.akcb-tooltip-header strong {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}

.akcb-tooltip-content p {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.akcb-tooltip-cta {
  background: linear-gradient(135deg, #00BFA5 0%, #00D4BD 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  display: inline-block;
  box-shadow: 0 2px 8px rgba(0, 191, 165, 0.3);
}

/* FAB (Floating Action Button) */
.akcb-fab {
  position: relative;
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #00BFA5 0%, #00D4BD 100%);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 6px 24px rgba(0, 191, 165, 0.4);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  animation: akcb-pulse 2.5s infinite;
  overflow: hidden;
}

.akcb-fab:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 12px 32px rgba(0, 191, 165, 0.5);
  animation: none;
}

.akcb-fab:active {
  transform: translateY(-2px) scale(1.02);
}

.akcb-fab-content {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.akcb-fab-icon {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.akcb-chat-icon {
  opacity: 1;
  transform: rotate(0deg) scale(1);
}

.akcb-close-icon {
  opacity: 0;
  transform: rotate(90deg) scale(0.5);
}

.akcb-fab.active .akcb-chat-icon {
  opacity: 0;
  transform: rotate(-90deg) scale(0.5);
}

.akcb-fab.active .akcb-close-icon {
  opacity: 1;
  transform: rotate(0deg) scale(1);
}

.akcb-online-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 14px;
  height: 14px;
  background: #4CAF50;
  border: 3px solid white;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.akcb-ripple {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  pointer-events: none;
  transform: scale(0);
  opacity: 0;
}

.akcb-fab:active .akcb-ripple {
  animation: akcb-ripple 0.6s ease-out;
}

/* Chat Window */
#akcb-chat-window {
  position: fixed;
  bottom: 100px;
  right: 24px;
  width: 420px;
  height: 650px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  animation: akcb-slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid rgba(0, 191, 165, 0.1);
}

/* Chat Header */
.akcb-chat-header {
  background: linear-gradient(135deg, #00BFA5 0%, #00D4BD 100%);
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.akcb-header-info {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
}

.akcb-header-avatar {
  position: relative;
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.akcb-avatar-status {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  background: #4CAF50;
  border: 2px solid white;
  border-radius: 50%;
}

.akcb-header-text {
  flex: 1;
}

.akcb-header-name {
  font-size: 17px;
  font-weight: 700;
  color: white;
  margin-bottom: 2px;
}

.akcb-header-status {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.akcb-close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.akcb-close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(90deg);
}

.akcb-close-btn:active {
  transform: rotate(90deg) scale(0.95);
}

/* Chat Body */
.akcb-chat-body {
  height: calc(100% - 84px);
  position: relative;
  background: #f5f5f5;
}

.akcb-chat-body iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  #akcb-chatbot-widget {
    bottom: 16px;
    right: 16px;
  }

  #akcb-welcome-tooltip {
    min-width: 260px;
    max-width: calc(100vw - 100px);
    padding: 16px 18px;
    bottom: 85px;
  }

  .akcb-fab {
    width: 60px;
    height: 60px;
  }

  #akcb-chat-window {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    border-radius: 0;
    max-width: 100%;
    max-height: 100%;
  }

  .akcb-chat-header {
    padding: 16px;
    padding-top: max(16px, env(safe-area-inset-top));
  }

  .akcb-chat-body {
    height: calc(100% - 76px);
  }
}

@media (max-width: 480px) {
  .akcb-fab {
    width: 56px;
    height: 56px;
  }

  .akcb-fab-icon svg {
    width: 24px;
    height: 24px;
  }

  #akcb-welcome-tooltip {
    min-width: 240px;
  }

  .akcb-tooltip-header strong {
    font-size: 16px;
  }

  .akcb-tooltip-content p {
    font-size: 13px;
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
    const chatWindow = document.getElementById('akcb-chat-window');
    const closeBtn = document.getElementById('akcb-chat-close');
    const welcomeTooltip = document.getElementById('akcb-welcome-tooltip');
    
    if (!toggleBtn || !chatWindow || !closeBtn) {
      console.warn('AKCB Chatbot: Elements not found');
      return;
    }
    
    let isOpen = false;
    let welcomeShown = false;
    
    // Show welcome tooltip after 2 seconds
    setTimeout(function() {
      if (welcomeTooltip && !isOpen && !welcomeShown) {
        welcomeTooltip.style.display = 'block';
        welcomeShown = true;
        
        // Auto-hide after 12 seconds
        setTimeout(function() {
          if (welcomeTooltip && !isOpen) {
            welcomeTooltip.style.opacity = '0';
            welcomeTooltip.style.transform = 'translateY(10px)';
            setTimeout(function() {
              welcomeTooltip.style.display = 'none';
            }, 300);
          }
        }, 12000);
      }
    }, 2000);
    
    // Click welcome tooltip to open chat
    if (welcomeTooltip) {
      welcomeTooltip.addEventListener('click', function() {
        openChat();
      });
      welcomeTooltip.style.cursor = 'pointer';
    }

    function openChat() {
      isOpen = true;
      
      // Hide welcome tooltip
      if (welcomeTooltip) {
        welcomeTooltip.style.display = 'none';
      }
      
      // Show chat window
      chatWindow.style.display = 'block';
      
      // Activate FAB
      toggleBtn.classList.add('active');
      toggleBtn.setAttribute('aria-label', 'Close chat');
      toggleBtn.style.animation = 'none';
      
      // Toggle icons
      const chatIcon = toggleBtn.querySelector('.akcb-chat-icon');
      const closeIcon = toggleBtn.querySelector('.akcb-close-icon');
      if (chatIcon) chatIcon.style.display = 'none';
      if (closeIcon) closeIcon.style.display = 'flex';
    }

    function closeChat() {
      isOpen = false;
      
      // Hide chat window with animation
      chatWindow.style.opacity = '0';
      chatWindow.style.transform = 'translateY(20px) scale(0.95)';
      
      setTimeout(function() {
        chatWindow.style.display = 'none';
        chatWindow.style.opacity = '1';
        chatWindow.style.transform = 'translateY(0) scale(1)';
      }, 300);
      
      // Deactivate FAB
      toggleBtn.classList.remove('active');
      toggleBtn.setAttribute('aria-label', 'Chat with AMA');
      toggleBtn.style.animation = 'akcb-pulse 2.5s infinite';
      
      // Toggle icons
      const chatIcon = toggleBtn.querySelector('.akcb-chat-icon');
      const closeIcon = toggleBtn.querySelector('.akcb-close-icon');
      if (chatIcon) chatIcon.style.display = 'flex';
      if (closeIcon) closeIcon.style.display = 'none';
    }

    // Toggle button click
    toggleBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      if (isOpen) {
        closeChat();
      } else {
        openChat();
      }
    });

    // Close button click
    closeBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      closeChat();
    });

    // Listen for messages from iframe
    window.addEventListener('message', function(e) {
      try {
        if (e.data && e.data.source === 'akcb-chat') {
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
    
    if (!toggleBtn || !chatContainer || !closeBtn) {
      console.warn('AKCB Chatbot: Elements not found');
      return;
    }
    
    let isOpen = false;
    
    // Show welcome bubble after 3 seconds
    setTimeout(function() {
      if (welcomeBubble && !isOpen) {
        welcomeBubble.style.display = 'flex';
      }
    }, 3000);
    
    // Auto-hide welcome bubble after 15 seconds
    setTimeout(function() {
      if (welcomeBubble) {
        welcomeBubble.style.opacity = '0';
        setTimeout(function() {
          welcomeBubble.style.display = 'none';
        }, 300);
      }
    }, 18000);

    // Close welcome bubble manually
    if (welcomeClose) {
      welcomeClose.addEventListener('click', function(e) {
        e.stopPropagation();
        welcomeBubble.style.opacity = '0';
        setTimeout(function() {
          welcomeBubble.style.display = 'none';
        }, 300);
      });
    }

    function openChat() {
      isOpen = true;
      chatContainer.classList.add('show');
      chatContainer.style.display = 'flex';
      
      // Hide welcome bubble when chat opens
      if (welcomeBubble) {
        welcomeBubble.style.display = 'none';
      }
      
      // Change button to close state
      toggleBtn.innerHTML = `
        <div class="akcb-avatar">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="white"/>
          </svg>
        </div>
        <span class="akcb-chat-text">Close Chat</span>
      `;
      toggleBtn.setAttribute('aria-expanded', 'true');
      toggleBtn.setAttribute('aria-label', 'Close Chat Assistant');
      toggleBtn.style.animation = 'none';
    }

    function closeChat() {
      isOpen = false;
      chatContainer.classList.remove('show');
      setTimeout(() => {
        chatContainer.style.display = 'none';
      }, 300);
      
      // Restore original button with avatar
      toggleBtn.innerHTML = `
        <div class="akcb-avatar">
          <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="22" fill="white" opacity="0.95"/>
            <path d="M24 4C12.95 4 4 12.95 4 24C4 35.05 12.95 44 24 44C35.05 44 44 35.05 44 24C44 12.95 35.05 4 24 4ZM24 11C27.31 11 30 13.69 30 17C30 20.31 27.31 23 24 23C20.69 23 18 20.31 18 17C18 13.69 20.69 11 24 11ZM24 38.4C19 38.4 14.58 35.84 12 31.98C12.06 27.99 20 25.8 24 25.8C27.99 25.8 35.94 27.99 36 31.98C33.42 35.84 29 38.4 24 38.4Z" fill="#0F4C81"/>
          </svg>
          <span class="akcb-status-dot"></span>
        </div>
        <span class="akcb-chat-text">Chat with AMA</span>
      `;
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.setAttribute('aria-label', 'Open Chat Assistant');
      toggleBtn.style.animation = 'pulse 2s infinite'12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
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


