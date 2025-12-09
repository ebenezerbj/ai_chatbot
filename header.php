
<!DOCTYPE html>
<html lang="en">

<head>
<meta charset="UTF-8">
<meta name="description" content="">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
<!-- The above 4 meta tags *must* come first in the head; any other head content must come *after* these tags -->

<!-- Title -->
<title>Amantin &amp; Kasei Comm. Bank Limited</title>

<!-- Favicon -->
<link rel="icon" href="img/core-img/apple-icon-57x57.png">



<!-- Stylesheet -->
<link rel="stylesheet" href="css/styles.css">
<link rel="stylesheet" href="style.css">
<!-- PAGE LEVEL STYLES -->
<link href="assets/plugins/dataTables/dataTables.bootstrap.css" rel="stylesheet" />
<link href='https://fonts.googleapis.com/css?family=IBM Plex Sans Condensed' rel='stylesheet'>


<link rel="stylesheet" href="css/css/open-iconic-bootstrap.min.css">
<link rel="stylesheet" href="css/css/animate.css">

<link rel="stylesheet" href="css/css/owl.carousel.min.css">
<link rel="stylesheet" href="css/css/owl.theme.default.min.css">
<link rel="stylesheet" href="css/css/magnific-popup.css">

<link rel="stylesheet" href="css/css/aos.css">

<link rel="stylesheet" href="css/css/ionicons.min.css">

<link rel="stylesheet" href="css/css/flaticon.css">
<link rel="stylesheet" href="css/css/icomoon.css">
<link rel="stylesheet" href="css/css/style.css">
<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">

</head>

<!-- Tawk.to removed - using AKCB AI Chatbot -->
<style>
body {
font-family: 'IBM Plex Sans Condensed';font-size: 16px;
}
</style>

<style>
@media only screen and (min-width: 768px) and (max-width: 991px) {
.breadcrumb-area {
height: 150px; } }
@media only screen and (min-width: 768px) and (max-width: 991px) {
.breadcrumb-area {
height: 150px; } }
@media only screen and (max-width: 767px) {
.breadcrumb-area {
height: 150px; } }
.breadcrumb-area .image-responsive {
position: absolute;
width: 100%;
height: 100%;
z-index: -12;
filter: brightness(1.6);
filter: contrast(1.3);
filter:saturate(1.3);

top: 0;
left: 0;
right: 0;
bottom: 0;
}
</style>

<body>
<!-- Preloader -->
<div class="preloader d-flex align-items-center justify-content-center">
<div class="lds-ellipsis">
<div></div>
<div></div>
<div></div>
<div></div>
</div>
</div>

<!-- ##### Header Area Start ##### -->
<header class="header-area">
<!-- Top Header Area -->
<div class="top-header-area">
<div class="container h-100">
<div class="row h-100 align-items-center">
<div class="col-12 d-flex justify-content-between">
<!-- Logo Area -->

<style>.work{
margin-left: 150px;
}.call{
margin-left: 100px;
}.fa-clock-o{
color: ;
} </style>
<!-- Top Contact Info -->
<div class="top-contact-info d-flex align-items-center">
<a href="locator.php" data-toggle="tooltip" data-placement="bottom" title="AMANTIN, BONO EAST GPS Address: BA-08182-6721"><img src="img/core-img/placeholder.png" alt=""> <span>AMANTIN,BONO EAST, GPS: BA-08182-6721</span></a>
<a href="contact.php" data-toggle="tooltip" data-placement="bottom" title="info@amankacombank.com"><img src="img/core-img/message.png" alt=""> <span>info@amankacombank.com</span></a>

<?php


include "sitedata/db_session.php";

$result=mysqli_query( $con, "SELECT * FROM contact_tb where agency like '%Amantin%'   order by id desc limit 1 ");

while($row=mysqli_fetch_array($result)){

?>
<a href="contact.php" class="call" data-toggle="tooltip" data-placement="bottom" title="<?php echo $row['phone'] ?>"> <span><img src="img/core-img/call.png" alt=""> <?php echo $row['phone'] ?> </a>
<?php } ?>

<a href="contact.php" class="work" data-toggle="tooltip" data-placement="bottom" title="Mon-Fri 8:00AM - 4PM"> <span> <i class="fa fa-clock-o fa-2x">  <span style="font-size:14px"> Mon-Fri 8:00AM - 4PM</span> </i></a>

</div>
</div>
</div>
</div>
</div>

<!-- Navbar Area -->
<div class="credit-main-menu" id="sticker">
<div class="classy-nav-container breakpoint-off">
<div class="container">
<!-- Menu -->
<nav class="classy-navbar justify-content-between" id="creditNav">

<!-- Navbar Toggler -->
<div class="classy-navbar-toggler">
<span class="navbarToggler"><span></span><span></span><span></span></span>
</div>

<!-- Menu -->
<div class="classy-menu">

<!-- Close Button -->
<div class="classycloseIcon">
<div class="cross-wrap"><span class="top"></span><span class="bottom"></span></div>
</div>

<!-- Nav Start -->
<div class="classynav">

<a href="index.php"><img src="img/core-img/logo_no_bg.png" alt="" style="height:80px; margin-right: 60px" ></a>

<ul>
<li><a href="index.php">Home</a></li>
<li><a href="aboutus.php">About Us </a>
<ul class="dropdown">

<li><a href="aboutus.php">History</a></li>

<li><a href="values.php"> Vission,Mission,Core Values</a></li>
<li><a href="board.php"> Board Of Directors</a></li>

<li><a href="seniormanagement.php"> Senior Management &amp; Unit Heads</a></li>
<li><a href="agency.php"> Agency Management </a></li>

<li>  <a href="https://webmail.amankacombank.com/roundcube/index.php?_user=info%40amankacombank.com" class="">
Corporate Mail
</a></li>
</ul>
</li>


<li><a href="products.php">Products &amp; Services </a>
<div class="megamenu my-mega">
<ul class="single-mega cn-col-4">
<p style="font-family: 'IBM Plex Sans Condensed';font-size: 32px;">Deposit Services</p>
<?php
include "sitedata/db_session.php";

$result=mysqli_query($con ,"SELECT * FROM moneytransfer_tb where groupid='Account Service'  order by item ASC limit 5 ");

while($row=mysqli_fetch_array($result)){

?>
<li style="font-family: 'IBM Plex Sans Condensed';font-size: 24px; text-transform:capitalize;"><p><a href="viewdetail.php?id=<?php echo $row['id'];?>"><?php echo $row['item'] ?></p></a></li>
<?php } ?>
</ul>
<ul class="single-mega cn-col-4">
<p style="font-family: 'IBM Plex Sans Condensed';font-size: 28px;">Advance Services</p>
<?php
include "sitedata/db_session.php";

$result=mysqli_query($con,"SELECT * FROM moneytransfer_tb where groupid='Loans Service'  order by item ASC limit 5 ");

while($row=mysqli_fetch_array($result)){

?>
<li style="font-family: 'IBM Plex Sans Condensed';font-size: 24px; text-transform:capitalize;"><p><a href="viewdetailadvance.php?id=<?php echo $row['id'];?>"><?php echo $row['item'] ?></p></a></li>
<?php } ?>
</ul>

<ul class="single-mega cn-col-4">
<p style="font-family: 'IBM Plex Sans Condensed';font-size: 28px;">Smart Banking</p>
<?php
include "sitedata/db_session.php";

$result=mysqli_query( $con,"SELECT * FROM moneytransfer_tb where groupid='Money Transfer'  order by item ASC limit 5 ");

while($row=mysqli_fetch_array($result)){

?>
<li style="font-family: 'IBM Plex Sans Condensed';font-size: 24px; text-transform:capitalize;"><p><a href="viewdetailsmart.php?id=<?php echo $row['id'];?>"><?php echo $row['item'] ?></p></a></li>
<?php } ?>
</ul>

<ul class="single-mega cn-col-4">
<p style="font-family: 'IBM Plex Sans Condensed';font-size: 28px;">Investment Services</p>
<?php
include "sitedata/db_session.php";

$result=mysqli_query($con, "SELECT * FROM moneytransfer_tb where groupid='Investment Service'  order by rand() limit 5 ");

while($row=mysqli_fetch_array($result)){

?>
<li style="font-family: 'IBM Plex Sans Condensed';font-size: 24px; text-transform:capitalize;"><p><a href="viewdetailinvest.php?id=<?php echo $row['id'];?>"><?php echo $row['item'] ?></p></a></li>
<?php } ?>

</ul>
</div>
</li>

<li><a href="#">Media </a>
<ul class="dropdown">
<li><a href="dormantacc.php">Dormant Accounts</a></li>
<li><a href="ournews.php">Our News letter</a></li>
<li><a href="gallary.php">Gallery</a></li>

</ul>
</li>
<li><a href="#">Our Branches </a>
<ul class="dropdown">

<li><a href="amantinbr.php">Amantin</a></li>
<li><a href="atebububr.php">Atebubu</a></li>
<li><a href="kejejibr.php">Kajaji </a></li>
<li><a href="yejibr.php">Yeji </a></li>
<li><a href="ejurabr.php">Ejura</a></li>
<li><a href="ahwiaabr.php">Ahwiaa(KUMASI) </a></li>
<li><a href="kdbr.php">Kwame Danso </a></li>
<li><a href="kejetiabr.php">Kejetia(KUMASI) </a></li>
</ul>
</li>
<li><a href="#">Investor Relations </a>
<ul class="dropdown">

<li><a href="financedetails.php">Annual Report</a></li>
<li><a href="ourcsr.php">Social Duties</a></li>
<li>  <a href="https://client.amankacombank.com" class="">
Shares Rgister
</a></li>

</ul>
</li>
<li><a href="overdraft/accounts/">Overdraft</a></li>
<li><a href="contact.php">Contact Us</a></li>
</ul></div>
<!-- Nav End -->
</div>

<!-- Contact -->
	
</nav>
</div>
</div>
</div>
</header>

