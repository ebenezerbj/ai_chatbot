

<!-- ##### Footer Area Start ##### -->
<footer class="footer-area section-padding-100-0">
<div class="container">
<div class="row">

<!-- Single Footer Widget -->
<div class="col-12 col-sm-6 col-lg-3">
<div class="single-footer-widget mb-100">
<h5 class="widget-title">About Us</h5>
<!-- Nav -->
<nav>
<ul>
<li><a href="index.php">Homepage</a></li>
<li><a href="aboutus.php">About Us</a></li>
<li><a href="products.php">Products &amp; Services</a></li>
<li><a href="ournews.php">Our News</a></li>	
<li><a href="ourcsr.php">CSR</a></li>

</ul>
</nav>
</div>
</div>

<!-- Single Footer Widget -->
<div class="col-12 col-sm-6 col-lg-3">
<div class="single-footer-widget mb-100">
<h5 class="widget-title">Our Loans</h5>
<!-- Nav -->
<nav>
<ul>
  <?php
  include "sitedata/connect.php";

    $result = $db->prepare("SELECT * FROM moneytransfer_tb where groupid='Loans Service'  order by id desc limit 5 ");
    $result->execute();
    for($i=0; $row = $result->fetch(); $i<5){


       ?>
<li><a href="products.php"><?php echo $row['item'] ?></a></li>
<?php } ?>
</ul>
</nav>
</div>
</div>

<!-- Single Footer Widget -->
<div class="col-12 col-sm-6 col-lg-3">
<div class="single-footer-widget mb-100">
<h5 class="widget-title">Our Money Transfer</h5>
<!-- Nav -->
<nav>
<ul>
  <?php
  include "sitedata/connect.php";

    $result = $db->prepare("SELECT * FROM moneytransfer_tb where groupid='Money Transfer'  order by id desc limit 5 ");
    $result->execute();
    for($i=0; $row = $result->fetch(); $i<5){


       ?>
  <li><a href="products.php"><?php echo $row['item'] ?></a></li>
  <?php } ?>
</ul>
</nav>
</div>
</div>

<!-- Single Footer Widget -->
<div class="col-12 col-sm-6 col-lg-3">
<div class="single-footer-widget mb-100">
<h5 class="widget-title">Our Accounts</h5>
<!-- Nav -->
<nav>
<ul>
  <?php
  include "sitedata/connect.php";

    $result = $db->prepare("SELECT * FROM moneytransfer_tb where groupid='Account Service'  order by id desc limit 5 ");
    $result->execute();
    for($i=0; $row = $result->fetch(); $i<5){


       ?>
  <li><a href="products.php"><?php echo $row['item'] ?></a></li>
  <?php } ?>
</ul>
</nav>
</div>
</div>

</div>
</div>



<!-- Copywrite Area -->
<div class="copywrite-area">
<div class="container">
<div class="row">
<div class="col-12">
<div class="copywrite-content d-flex flex-wrap justify-content-between align-items-center">

<!-- Copywrite Text -->

<p class="copywrite-text">
Copyright &copy;<script>document.write(new Date().getFullYear());</script> All rights reserved | AKCB LIMITED   <a href="#" target="_blank">
</p>
<p class="copywrite-text">
</script>Contact Us: Head Office Phone: 0202055171 | Email: info@amankacombank.com   <a href="#" target="_blank">
</p>
</div>
</div>
</div>
</div>
</div>
</footer>
<!-- ##### Footer Area Start ##### -->

<!-- ##### All Javascript Script ##### -->
<!-- jQuery-2.2.4 js -->
<script src="js/jquery/jquery-2.2.4.min.js"></script>
<!-- Popper js -->
<script src="js/bootstrap/popper.min.js"></script>
<!-- Bootstrap js -->
<script src="js/bootstrap/bootstrap.min.js"></script>
<!-- All Plugins js -->
<script src="js/plugins/plugins.js"></script>
<!-- Active js -->
<script src="js/active.js"></script>


<script src="js1/main.js"></script>

<script>
      $(document).ready(function(){
          $("#mycarousel").carousel( { interval: 2000 } );
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

  <script src="js/js/jquery.min.js"></script>
  <script src="js/js/jquery-migrate-3.0.1.min.js"></script>
  <script src="js/js/popper.min.js"></script>
  <script src="js/js/bootstrap.min.js"></script>
  <script src="js/js/jquery.easing.1.3.js"></script>
  <script src="js/js/jquery.waypoints.min.js"></script>
  <script src="js/js/jquery.stellar.min.js"></script>
  <script src="js/js/owl.carousel.min.js"></script>
  <script src="js/js/jquery.magnific-popup.min.js"></script>
  <script src="js/js/aos.js"></script>
  <script src="js/js/jquery.animateNumber.min.js"></script>
  <script src="js/js/scrollax.min.js"></script>
  <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBVWaKrjvy3MaE7SQ74_uJiULgl1JY0H2s&sensor=false"></script>
  <script src="js/js/google-map.js"></script>
  <script src="js/js/main.js"></script>

<!-- Tawk.to removed - using AKCB AI Chatbot instead -->

</body>

</html>
