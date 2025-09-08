<?php include ('header.php'); ?>

<!--AI Chatbot Widget - Primary Customer Service Chat-->
<script type="text/javascript">
// Ensure legacy Tawk.to is fully removed if injected by upstream includes
(function(){
    function killTawk(){
        try {
            // Remove Tawk loader scripts
            document.querySelectorAll('script[src*="tawk.to"]').forEach(function(s){ s.remove(); });
            // Remove common Tawk containers/iframes
            var selectors = [
                '[id^="tawk_"]',
                '#tawkchat-minified-wrapper',
                '#tawkchat-minified-container',
                '#tawkchat-status',
                'iframe[src*="tawk.to"]'
            ];
            document.querySelectorAll(selectors.join(',')).forEach(function(el){ try { el.remove(); } catch(e){} });
            // Best-effort hide if removal is blocked
            var style = document.getElementById('hide-tawk-style');
            if (!style) {
                style = document.createElement('style');
                style.id = 'hide-tawk-style';
                style.textContent = '[id^="tawk_"],#tawkchat-minified-wrapper,#tawkchat-minified-container,#tawkchat-status,iframe[src*="tawk.to"]{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}';
                document.head.appendChild(style);
            }
        } catch(_){}
    }
    // Observe DOM for late injections
    var obs = new MutationObserver(function(muts){
        var affected = false;
        muts.forEach(function(m){
            m.addedNodes && m.addedNodes.forEach(function(n){
                if (n && n.nodeType === 1) {
                    var el = n;
                    if (el.matches && el.matches('script[src*="tawk.to"], [id^="tawk_"], iframe[src*="tawk.to"]')) affected = true;
                    if (!affected && el.querySelector && el.querySelector('script[src*="tawk.to"], [id^="tawk_"], iframe[src*="tawk.to"]')) affected = true;
                }
            });
        });
        if (affected) killTawk();
    });
    try { obs.observe(document.documentElement, { childList: true, subtree: true }); } catch(_){ }
    // Run immediately and on DOM ready
    killTawk();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', killTawk);
})();
</script>

<!-- AI Chatbot Widget -->
<style>
/* AI Chatbot Styles - Primary Customer Service Chat */
#ai-chatbot-widget {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 380px;
    height: 550px;
    border: none;
    border-radius: 12px;
    box-shadow: 0 8px 30px rgba(15, 76, 129, 0.3);
    z-index: 1000;
    display: none;
    background: white;
}

#ai-chatbot-toggle {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 70px;
    height: 70px;
    border-radius: 50%;
    background: linear-gradient(135deg, #0F4C81 0%, #0171ad 100%);
    border: none;
    cursor: pointer;
    box-shadow: 0 6px 25px rgba(15, 76, 129, 0.4);
    z-index: 1001;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
}

#ai-chatbot-toggle:hover {
    transform: scale(1.1);
    box-shadow: 0 8px 35px rgba(15, 76, 129, 0.5);
}

#ai-chatbot-toggle svg {
    width: 32px;
    height: 32px;
    fill: white;
}

.chatbot-notification {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 24px;
    height: 24px;
    background: #ff4444;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: white;
    font-weight: bold;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.7; }
    100% { transform: scale(1); opacity: 1; }
}

/* Welcome message for first-time visitors */
.chatbot-welcome {
    position: fixed;
    bottom: 100px;
    right: 20px;
    background: white;
    padding: 15px 20px;
    border-radius: 15px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    z-index: 999;
    max-width: 280px;
    font-family: 'IBM Plex Sans Condensed', sans-serif;
    font-size: 14px;
    color: #333;
    border-left: 4px solid #0F4C81;
    animation: slideInFromRight 0.5s ease-out;
}

@keyframes slideInFromRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

.chatbot-welcome::after {
    content: '';
    position: absolute;
    bottom: -8px;
    right: 30px;
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 8px solid white;
}

@media (max-width: 768px) {
    #ai-chatbot-widget {
        width: 100%;
        height: 100%;
        bottom: 0;
        right: 0;
        border-radius: 0;
    }
    
    #ai-chatbot-toggle {
        bottom: 30px;
        right: 30px;
        width: 65px;
        height: 65px;
    }
    
    .chatbot-welcome {
        right: 10px;
        bottom: 110px;
        max-width: calc(100% - 20px);
    }
}
</style>

<script>
// AI Chatbot Widget Configuration - Primary Customer Service
(function() {
    // Determine the chatbot URL based on environment
    const CHATBOT_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3000' 
        : 'https://ai-chatbot-1-a596.onrender.com';
    
    let chatbotVisible = false;
    let welcomeShown = false;
    
    // Create chatbot elements
    function createChatbotWidget() {
        // Toggle button
        const toggleButton = document.createElement('button');
        toggleButton.id = 'ai-chatbot-toggle';
        toggleButton.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3.04 1.05 4.35L1 23l6.65-2.05C9.96 21.64 11.46 22 13 22h-1c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.1 0-2.18-.25-3.15-.72L4 20l.72-4.85C4.25 14.18 4 13.1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"/>
                <circle cx="9" cy="12" r="1"/>
                <circle cx="12" cy="12" r="1"/>
                <circle cx="15" cy="12" r="1"/>
            </svg>
        `;
        
        // Add notification indicator
        const notification = document.createElement('div');
        notification.className = 'chatbot-notification';
        notification.textContent = '!';
        toggleButton.appendChild(notification);
        
        // Chat widget iframe
        const chatWidget = document.createElement('iframe');
        chatWidget.id = 'ai-chatbot-widget';
        chatWidget.src = CHATBOT_URL;
        chatWidget.title = 'AI Customer Service Chat';
        chatWidget.allow = 'microphone; camera; geolocation; autoplay; clipboard-read; clipboard-write';
                // Track load state for fallback
                let chatLoaded = false;
                chatWidget.addEventListener('load', function() {
                    chatLoaded = true;
                    // Hide fallback if it was showing and iframe finally loaded
                    const fb = document.getElementById('ai-chatbot-fallback');
                    if (fb) fb.style.display = 'none';
                });

                // Fallback overlay if embedding is blocked
                const fallback = document.createElement('div');
                fallback.id = 'ai-chatbot-fallback';
                fallback.style.position = 'fixed';
                fallback.style.bottom = '100px';
                fallback.style.right = '20px';
                fallback.style.zIndex = '1002';
                fallback.style.display = 'none';
                fallback.style.background = '#fff';
                fallback.style.border = '1px solid #e5e7eb';
                fallback.style.borderRadius = '10px';
                fallback.style.boxShadow = '0 10px 25px rgba(0,0,0,0.12)';
                fallback.style.padding = '12px 14px';
                fallback.style.maxWidth = '300px';
                fallback.style.fontFamily = "'IBM Plex Sans Condensed', sans-serif";
                fallback.style.color = '#374151';
                                fallback.innerHTML = `
                                        <div style="display:flex; align-items:flex-start; gap:10px">
                                                <div style="flex:1">
                                                        <div style="font-weight:600; margin-bottom:4px">Chat couldn’t be embedded</div>
                                                        <div style="font-size:13px; line-height:1.4">Your browser or our security settings blocked the in-page chat. You can still chat in a new tab.</div>
                                                </div>
                                                <div style="display:flex; gap:8px">
                                                    <button type="button" class="retry-embed" style="white-space:nowrap; background:#111827; color:#fff; border:none; cursor:pointer; padding:8px 10px; border-radius:8px; font-size:13px; font-weight:600">Retry</button>
                                                    <a href="${CHATBOT_URL}" target="_blank" rel="noopener" style="white-space:nowrap; background:#0F4C81; color:#fff; text-decoration:none; padding:8px 10px; border-radius:8px; font-size:13px; font-weight:600">Open chat</a>
                                                </div>
                                        </div>`;
                                // Wire up retry
                                fallback.addEventListener('click', function(e){
                                    const t = e.target;
                                    if (t && t.classList && t.classList.contains('retry-embed')) {
                                        chatLoaded = false;
                                        // bust cache and retry load
                                        const url = CHATBOT_URL + (CHATBOT_URL.includes('?') ? '&' : '?') + 't=' + Date.now();
                                        chatWidget.src = url;
                                        // show a quick loading state on the button
                                        t.textContent = 'Retrying…';
                                        setTimeout(function(){ t.textContent = 'Retry'; }, 2000);
                                    }
                                });
        
        // Welcome message
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'chatbot-welcome';
        welcomeMessage.innerHTML = `
            <strong>👋 Need help with banking?</strong><br>
            Our AI assistant is here 24/7 to help you with accounts, transfers, loans, and more!
        `;
        
        // Add elements to page
    document.body.appendChild(toggleButton);
    document.body.appendChild(chatWidget);
    document.body.appendChild(fallback);
    document.body.appendChild(welcomeMessage);
        
        // Show welcome message after 3 seconds
        setTimeout(() => {
            if (!welcomeShown && !chatbotVisible) {
                welcomeMessage.style.display = 'block';
                welcomeShown = true;
                
                // Hide welcome message after 8 seconds
                setTimeout(() => {
                    welcomeMessage.style.display = 'none';
                }, 8000);
            }
        }, 3000);
        
        // Hide welcome message when clicking anywhere
        document.addEventListener('click', function(e) {
            if (!welcomeMessage.contains(e.target) && !toggleButton.contains(e.target)) {
                welcomeMessage.style.display = 'none';
            }
        });
        
        // Toggle functionality
        toggleButton.addEventListener('click', function() {
            chatbotVisible = !chatbotVisible;
            chatWidget.style.display = chatbotVisible ? 'block' : 'none';
            if (!chatbotVisible) { fallback.style.display = 'none'; }
            welcomeMessage.style.display = 'none'; // Hide welcome when opening chat
            
            // Hide notification when chat is opened
            if (chatbotVisible) {
                notification.style.display = 'none';
                // If iframe doesn’t load within 3s, show fallback
                chatLoaded = false;
                setTimeout(function(){ if (!chatLoaded && chatbotVisible) fallback.style.display = 'block'; }, 3000);
                // Let iframe know it became visible
                try { chatWidget.contentWindow?.postMessage({ source: 'akcb-chat-parent', type: 'setVisible', visible: true }, '*'); } catch(e){}
            }
            
            // Update button icon
            if (chatbotVisible) {
                toggleButton.innerHTML = `
                    <svg viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                `;
            } else {
                toggleButton.innerHTML = `
                    <svg viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3.04 1.05 4.35L1 23l6.65-2.05C9.96 21.64 11.46 22 13 22h-1c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.1 0-2.18-.25-3.15-.72L4 20l.72-4.85C4.25 14.18 4 13.1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"/>
                        <circle cx="9" cy="12" r="1"/>
                        <circle cx="12" cy="12" r="1"/>
                        <circle cx="15" cy="12" r="1"/>
                    </svg>
                `;
                                // Inform iframe it is hidden
                                try { chatWidget.contentWindow?.postMessage({ source: 'akcb-chat-parent', type: 'setVisible', visible: false }, '*'); } catch(e){}
            }
        });

                // Unread badge: show when assistant messages arrive while hidden
                (function wireUnreadBadge(){
                    let unread = 0;
                    window.addEventListener('message', function(e){
                        try {
                            const data = e?.data || {};
                            if (!data || data.source !== 'akcb-chat') return;
                            if (data.type === 'ready') {
                                // Optionally clear unread on load
                                if (chatbotVisible) unread = 0;
                            }
                            if (data.type === 'assistantMessage') {
                                if (!chatbotVisible) {
                                    unread++;
                                    notification.style.display = 'flex';
                                    notification.textContent = unread > 9 ? '9+' : String(unread);
                                }
                            }
                        } catch(_){}
                    });
                    // Reset unread when opening
                    const openObserver = new MutationObserver(function(){
                        if (chatWidget.style.display === 'block') {
                            unread = 0; notification.style.display = 'none';
                        }
                    });
                    try { openObserver.observe(chatWidget, { attributes: true, attributeFilter: ['style'] }); } catch(_){ }
                })();
    }
    
    // Initialize when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createChatbotWidget);
    } else {
        createChatbotWidget();
    }
})();
</script>

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

<h2 data-animation="fadeInUp" data-delay="300ms"><?php // echo $row['bannertext'] ?></h2>
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

<h2 style="font-family:'IBM Plex Sans Condensed'; color:black; font-size:16px;line-height: 30px;text-align:center"> <?php echo $row['loantext'] ?></h2>
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
<h2 style="font-family:'IBM Plex Sans Condensed'; color:black; font-size:16px;line-height: 30px;text-align:center"> <?php echo $row['loantext'] ?></h2>
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

<h2 style="font-family:'IBM Plex Sans Condensed'; color:black; font-size:16px;line-height: 30px;text-align:center"> <?php echo $row['loantext'] ?></h2>
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

<h2 style="font-family:'IBM Plex Sans Condensed'; text-transform:uppercase; color:#003679; font-size:20px;line-height: 30px;text-align:center"> <?php echo $row['title'] ?></h2>
<h2 style="font-family:'IBM Plex Sans Condensed'; color:black; font-size:16px;line-height: 30px;text-align:justify"> <?php echo $row['description'] ?></h2>

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

<h2 style="font-family:'IBM Plex Sans Condensed'; text-transform:uppercase; color:#003679; font-size:20px;line-height: 30px;text-align:center"> <?php echo $row['title'] ?></h2>
<h2 style="font-family:'IBM Plex Sans Condensed'; color:black; font-size:16px;line-height: 30px;text-align:center"> <?php echo $row['description'] ?></h2>

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

<h2 style="font-family:'IBM Plex Sans Condensed'; text-transform:uppercase; color:#003679; font-size:20px;line-height: 30px;text-align:center"> <?php echo $row['title'] ?></h2>
<h2 style="font-family:'IBM Plex Sans Condensed'; color:black; font-size:16px;line-height: 30px;text-align:center"> <?php echo $row['description'] ?></h2>

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

<h2 style="font-family:'IBM Plex Sans Condensed'; text-transform:uppercase; color:#003679; font-size:20px;line-height: 30px;text-align:center"> <?php echo $row['title'] ?></h2>
<h2 style="font-family:'IBM Plex Sans Condensed'; color:black; font-size:16px;line-height: 30px;text-align:center"> <?php echo $row['description'] ?></h2>

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


