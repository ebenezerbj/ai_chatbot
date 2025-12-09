<?php include ('headernews.php'); ?>    <!-- ##### Header Area End ##### -->
    <!-- ##### Header Area End ##### -->
<style>

/* :: OTHER PAGES MOBILE VIEW */

	@media only screen and (min-width: 768px) and (max-width: 991px) {
    .breadcrumb-area {
      height: 100px; } }
  @media only screen and (min-width: 768px) and (max-width: 991px) {
    .breadcrumb-area {
      height: 100px; } }
  @media only screen and (max-width: 767px) {
    .breadcrumb-area {
      height: 100px; } }
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

/* PDF Action Buttons */
.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
  line-height: 1.5;
  border-radius: 4px;
  text-decoration: none;
  display: inline-block;
  transition: all 0.3s ease;
  border: none;
  cursor: pointer;
}

.btn-primary {
  background-color: #0F4C81;
  color: white;
}

.btn-primary:hover {
  background-color: #1a5a96;
  color: white;
  text-decoration: none;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(15, 76, 129, 0.3);
}

.btn-success {
  background-color: #10b981;
  color: white;
}

.btn-success:hover {
  background-color: #059669;
  color: white;
  text-decoration: none;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
}

.btn-sm i {
  margin-right: 4px;
}

/* Mobile responsive buttons */
@media only screen and (max-width: 767px) {
  .btn-sm {
    padding: 8px 10px;
    font-size: 12px;
    margin-bottom: 5px;
  }
  
  td .btn-sm {
    display: block;
    width: 100%;
    margin-right: 0 !important;
  }
}

</style>


    <?php
    include "sitedata/connect.php";

    $result = $db->prepare("SELECT * FROM banner_tb where type='Financials'  order by id DESC limit 1 ");
    $result->execute();
    for($i=0; $row = $result->fetch(); $i<1){
      ?>
    <section class="breadcrumb-area bg-img image-responsive" style="background-image: url('siteimages/<?php echo $row['photo']?>');">
        <div class="container h-100">
            <div class="row h-100 align-items-center">
                <div class="col-12">
                    <div class="breadcrumb-content">

                        <nav aria-label="breadcrumb">
                            <ol class="breadcrumb">
                                <li class="breadcrumb-item"><a href="#">Home</a></li>
                                <li class="breadcrumb-item active" aria-current="page">FINANCIALS</li>
                            </ol>
                        </nav>
                    </div>
                </div>
            </div>
        </div>
    </section>
  <?php } ?>


<!-- ##### Breadcrumb Area End ##### -->
<link href="https://fonts.googleapis.com/css?family=Oswald:400,700|Roboto:400,500" rel="stylesheet">

<!-- Bootstrap -->
<link href="assetsb/css/bootstrap.min.css" rel="stylesheet">

<!-- Font Awesome -->
<link href="assetsb/fonts/font-awesome/css/font-awesome.min.css" rel="stylesheet">

<!-- Owl carousel -->
<link href="assetsb/css/owl.carousel.css" rel="stylesheet">
<link href="assetsb/css/owl.theme.css" rel="stylesheet">

<!-- Off Canvas Menu -->
<link href="assetsb/css/offcanvas.min.css" rel="stylesheet">

<!--Theme CSS -->
<link href="assetsb/css/style.css" rel="stylesheet">


    <!-- ##### Breadcrumb Area End ##### -->

    <!-- ##### News Area Start ##### -->
    <section class="news-area section-padding-100">
        <div class="container">
            <div class="row">
                <!-- Single News Area -->


                <div class="col-12 col-lg-8">

                    <!-- Single Blog Area -->
                    <div class="single-blog-area mb-70">
                      <div class="panel panel-default">
                      <div class="panel-heading">
                    <p style="font-family: 'IBM Plex Sans Condensed';font-size: 24px; line-height:38px;  color:black">  YEARLY FINANCIAL STATEMENTS </p>
                      </div>
                      <div class="panel-body">
                      <div class="table-responsive">
                      <table class="table table-striped table-bordered table-hover" id="dataTables-example">
                      <thead>
                      <tr>
                      <th>SL</th>
                      <th>TITLE</th>
                      <th>YEAR</th>
                      <th>DOCUMENT TYPE</th>
                      <th>ACTIONS</th>
                      </tr>
                      </thead>
                      <tbody>
                      <?php


                      include "sitedata/connect.php";

                      $result = $db->prepare("SELECT * FROM financials_tb   order by id desc limit 10 ");
                      $result->execute();
                      for($i=0; $row = $result->fetch(); $i<10){


                      ?>

                        <tr class="odd gradeX">
                        <td><?php echo $i++; ?></td>
                        <td><?php echo $row['title'] ?></td>
                        <td><?php echo $row['year'] ?></td>
                        <td><img src="siteimages/pdf.png" style="width:80px; height:80px"></td>
                        <td>
                          <a href="view1.php?path=sitedoc/<?php echo $row['document'] ?>" 
                             target="_blank" 
                             class="btn btn-primary btn-sm" 
                             style="margin-right: 5px;">
                            <i class="fa fa-eye"></i> View
                          </a>
                          <a href="download1.php?path=sitedoc/<?php echo $row['document'] ?>" 
                             class="btn btn-success btn-sm">
                            <i class="fa fa-download"></i> Download
                          </a>
                        </td>
                         </tr>
                      <?php
                      }

                        ?>


                      </tbody>
                      </table>
                      </div>

                      </div>
                      </div>

                    </div>


                    <!-- Pagination -->

                </div>


                <!-- Sidebar Area -->
                <div class="col-12 col-sm-9 col-md-6 col-lg-4">
                    <div class="sidebar-area">

                        <!-- Single Sidebar Widget -->
                        <div class="single-widget-area search-widget">
                            <form action="ourcsrsearchdetail.php" method="post">
                                <input type="search" name="year" placeholder="Enter year to serach our CSR Achieve">
                                <button type="submit" name="search">Search</button>
                            </form>
                        </div>


                    </div>


 <div class="tab sitebar">
              <ul class="nav nav-tabs">
                <li class="active"><a  href="#1" data-toggle="tab">Deposit Service</a></li>
                <li><a href="#2" data-toggle="tab">Advance Sevices</a></li>
				  <li ><a  href="#3" data-toggle="tab">Investment Services</a></li>
				  <li ><a  href="#4" data-toggle="tab">Smart Banking</a></li>
              </ul>

              <div class="tab-content">
                <div class="tab-pane active" id="1">
                  <?php
                  include "sitedata/connect.php";

                  $result = $db->prepare("SELECT * FROM moneytransfer_tb where groupid='Account Service'  order by rand() desc limit 5 ");
                  $result->execute();
                  for($i=0; $row = $result->fetch(); $i<5){


                  ?>

                  <div class="item_wrapper1">
									<div class="item_content">
									<p style="font-family:'IBM Plex Sans Condensed'; font-size:16px; line-height:18px; "><a href="products.php"><?php echo $row['item'] ?></a> </p>		</div><!--item_content--></div>

						<hr>
                <?php } ?>

            </div><!--tab-pane-->

                <div class="tab-pane" id="2">
                  <?php
                  include "sitedata/connect.php";

                  $result = $db->prepare("SELECT * FROM moneytransfer_tb where groupid='Loans Service'  order by rand() desc limit 5 ");
                  $result->execute();
                  for($i=0; $row = $result->fetch(); $i<5){


                  ?>

                  <div class="item_wrapper1">
									<div class="item_content">
									<p style="font-family:'IBM Plex Sans Condensed'; font-size:16px; line-height:18px; "><a href="products.php"><?php echo $row['item'] ?></a> </p>		</div><!--item_content--></div>

						<hr>
                <?php } ?>
            </div><!--tab-pane-->

                <div class="tab-pane active" id="3">
                  <?php
                  include "sitedata/connect.php";

                  $result = $db->prepare("SELECT * FROM moneytransfer_tb where groupid='Investment Service'  order by rand() desc limit 5 ");
                  $result->execute();
                  for($i=0; $row = $result->fetch(); $i<5){


                  ?>

                  <div class="item_wrapper1">
									<div class="item_content">
									<p style="font-family:'IBM Plex Sans Condensed'; font-size:16px; line-height:18px; "><a href="products.php"><?php echo $row['item'] ?></a> </p>		</div><!--item_content--></div>

						<hr>
                <?php } ?>

            </div><!--tab-pane-->

                <div class="tab-pane active" id="4">
                  <?php
                  include "sitedata/connect.php";

                  $result = $db->prepare("SELECT * FROM moneytransfer_tb where groupid='Money Transfer'  order by rand() desc limit 5 ");
                  $result->execute();
                  for($i=0; $row = $result->fetch(); $i<5){


                  ?>

                  <div class="item_wrapper1">
									<div class="item_content">
									<p style="font-family:'IBM Plex Sans Condensed'; font-size:16px; line-height:18px; "><a href="products.php"><?php echo $row['item'] ?></a> </p>		</div><!--item_content--></div>

						<hr>
                <?php } ?>

            </div><!--tab-pane-->

		</div>

        				            </div><!--media-->
                        </div><!--most_comment--></section><!--feature_category_section-->
    </section>
    <!-- ##### Newsletter Area Start ###### -->
    <?php include ('newsletter.php'); ?>
    <!-- ##### Newsletter Area End ###### -->

    <!-- ##### Footer Area Start ##### -->
    <?php include ('footernews.php'); ?>
    <script src="assets/plugins/dataTables/jquery.dataTables.js"></script>
    <script src="assets/plugins/dataTables/dataTables.bootstrap.js"></script>
    <script>
    $(document).ready(function () {
    $('#dataTables-example').dataTable();
    });
    </script>
