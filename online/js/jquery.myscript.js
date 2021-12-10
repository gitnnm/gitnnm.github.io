function replaceFont() { 
			
	Cufon.replace('.timer_circle,.aller,.timer_unit .text',{fontFamily: 'Aller'});
			
}
function clear_form_elements(ele) {

    $(ele).find(':input').each(function() {
        switch(this.type) {
            case 'password':
            case 'select-multiple':
            case 'select-one':
            case 'text':
            case 'textarea':
                $(this).val('');
                break;
            case 'checkbox':
            case 'radio':
                this.checked = false;
        }
    });

}
$(document).ready(function(){
	replaceFont();
	/* PRETTYPHOTO STARTS */
	$("a[rel^='prettyPhoto']").prettyPhoto();
	/* PRETTYPHOTO ENDS */
	
	/* COUNTDOWN STARTS */
	 
	 var liftoffTime = new Date(2018, 11 , 31); // Launching Date. (0:January,1:Febuary,2:March,3:April,4:May etc)
	 $('#timer').countdown({ 
		  labels: ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds'], 
          labels1: ['year', 'month', 'week', 'day', 'hour', 'minute', 'second'],
		  until: liftoffTime, format: 'DHMS',
		  layout: '<div class="timer_unit timer_first"><div class="timer_circle"><div class="text_timer">{dn}</div></div><div class="text">{dl}</div></div><div class="timer_unit"><div class="timer_circle"><div class="text_timer">{hn}</div></div><div class="text">{hl}</div></div><div class="timer_unit"><div class="timer_circle"><div class="text_timer">{mn}</div></div><div class="text">{ml}</div></div><div class="timer_unit"><div class="timer_circle"><div class="text_timer">{sn}</div></div><div class="text">{sl}</div></div>', 
		  onTick: replaceFont }); 
	 
	/* COUNTDOWN ENDS */
	
	/* COUNTDOWN PROGRESSBAR START */
	/*
		var startDate = new Date(2012,3,20);
		var releaseDate = new Date(2012,3,30);
		today = new Date();
		totalsToGo = Math.ceil((releaseDate.getTime() - startDate.getTime() ) / (1000*60*60*24));
		
		if (totalsToGo<0) totalsToGo = 0;
		if ((totalsToGo!=0)&&(today.getTime()<=releaseDate.getTime())) {
			daysToGo = Math.ceil((releaseDate.getTime() - today.getTime() ) / (1000*60*60*24));
			percentage = (1 - (daysToGo/totalsToGo))*340;
			percent = Math.ceil(percentage);
		} 
		else
			percent = 340;
		$('#timer').html('<div class="progress_bar"><div class="progress_bar_container"><div class="progress_bar_counter"></div><div class="progress_bar_shadow"></div></div><center class="text">Progressing</center></div>');
		$('#timer .progress_bar .progress_bar_container .progress_bar_counter').css({'height':'0'+'px'}).animate({"height": percent,}, 2500 );
	*/
	/* COUNTDOWN PROGRESSBAR ENDS */
	
	/* NAVIGATION STARTS */
	$('#navigation #nav li a').click(function(e) {
        e.preventDefault(); // prevent the default action
        e.stopPropagation(); // stop the click from bubbling
        $(this).closest('ul').find('.select').removeClass('select');
        $(this).parent().addClass('select');
    });
	/* NAVIGATION ENDS */
	
	/* PORTFOLIO IMAGE START */
	jQuery(".link_icon").hide();                  // Initially hide all buttons
    jQuery(".zoom_icon").hide();                  // Initially hide all buttons
	jQuery('.show-image').hover(function() {
		$(this).closest('.content').find('div').addClass('mydark');
        $(this).removeClass('mydark');
         jQuery(this).find('.link_icon').stop(true,true).fadeIn(300).animate({top: "23px",left: "40px" }, 'slow');
		 jQuery(this).find('.zoom_icon').stop(true,true).fadeIn(300).animate({ top: "23px",left: "90px" }, 'slow');

		
		
    }, function() {
		$(this).closest('.content').find('div').removeClass('mydark');
        jQuery(this).find('.link_icon').stop(true,true).fadeOut(0).animate({ top: "0px",left: "0px" }, 'slow');         
		jQuery(this).find('.zoom_icon').stop(true,true).fadeOut(0).animate({ top: "48px",left: "133px" }, 'slow');
		// use .find() !
    });

	/* PORTFOLIO IMAGE ENDS */
	
	/* ADDRESS START */
	jQuery("#contact .content  #address_text").hide();                  // Initially hide all buttons
    jQuery('#contact .content  #address').hover(function() {
         jQuery('#contact .content  #address_text').stop(true,true).fadeIn(500);
    }, function() {
		jQuery('#contact .content  #address_text').stop(true,true).fadeOut(0);
    });
	
	/* ADDRESS ENDS */
	
	
	// SUBSCRIBE START
	$("form#form_subscribe").submit(function(form) {
		
		var Email = $(':text[name=subscribe_email]').val();
		if ((Email=="")||(Email=="enter your email address")) {
			$('#subscribe .confirm').hide().html('<img class="left" src="images/cross_icon.png"> <p class="error left">Email may not be empty</p>').fadeIn().delay(1500).fadeOut();
			$(':text[name=subscribe_email]').focus();
			return false;
		}
		if (!Email.match(/^[\w\.-]+@(?:[A-Za-z0-9-]+\.)*[A-Za-z0-9-]{1,}\.[a-z]{2,9}$/))
		{
			$('#subscribe .confirm').hide().html('<img class="left" src="images/cross_icon.png"> <p class="error left">Email is not valid</p>').fadeIn().delay(1500).fadeOut();
			$(':text[name=subscribe_email]').focus();
			return false;
		}
	
		$.ajax({
			type: "GET",
			url: "form_subscribe_process.php",
			cache: false,
			
			data: 'subscribe_email=' + Email,

			
			beforeSend: function() {
					
			},
			success: function(html){
				$('#subscribe .confirm').hide().html(html).fadeIn().delay(2500).fadeOut();;
				clear_form_elements('#form_subscribe');
				return false;
			},
			error : function() {
				$('#subscribe .confirm').hide().html('<img class="left" src="images/cross_icon.png"> <p class="error left">Email failed to be sent</p>').fadeIn().delay(1500).fadeOut();

				
				return false;
			}
		});
		return false;
	});
	// SUBSCRIBE ENDS
	
	//CONTACT US STARTS
	$("form#form_contact").submit(function(form) {
		
		var Name = $(':text[name=contact_name]').val();
		if ((Name=="")||(Name=="Name Here..."))
		{
			$('#contact .confirm').hide().html('<img class="left" src="images/cross_icon.png"> <p class="error left">Name may not be empty</p>').fadeIn().delay(1500).fadeOut();
			$(':text[name=contact_name]').focus();
			return false;
		}
		
		
		
		var Email = $(':text[name=contact_email]').val();
		if ((Email=="")||(Email=="Email Here...")) {
			$('#contact .confirm').hide().html('<img class="left" src="images/cross_icon.png"> <p class="error left">Email may not be empty</p>').fadeIn().delay(1500).fadeOut();
			$(':text[name=contact_email]').focus();
			return false;
		}
		if (!Email.match(/^[\w\.-]+@(?:[A-Za-z0-9-]+\.)*[A-Za-z0-9-]{1,}\.[a-z]{2,9}$/))
		{
			$('#contact .confirm').hide().html('<img class="left" src="images/cross_icon.png"> <p class="error left">Email is not valid</p>').fadeIn().delay(1500).fadeOut();
			$(':text[name=contact_email]').focus();
			return false;
		}
		var Message = $('textarea[name=contact_message]').val();
		
		if ((Message=="")||(Message=="Message Here...")) {
			$('#contact .confirm').hide().html('<img class="left" src="images/cross_icon.png"> <p class="error left">Message may not be empty</p>').fadeIn().delay(1500).fadeOut();
			$('textarea[name=contact_message]').focus();
			return false;
		}
		
		var Phone = $(':text[name=contact_phone]').val();
		if ((Phone=="")||(Phone=="Phone Here..."))
		{
			Phone = '';
			
		}
		var Website = $(':text[name=contact_website]').val();
		if ((Website=="")||(Website=="Website Here..."))
		{
			Website = '';
			
		}
		
		var Captcha = $(':text[name=contact_captcha]').val();
		if ((Captcha!="16"))
		{
			$('#contact .confirm').hide().html('<img class="left" src="images/cross_icon.png"> <p class="error left">Captcha is wrong</p>').fadeIn().delay(1500).fadeOut();
			$(':text[name=contact_message]').focus();
			return false;
		}
		
		$.ajax({
			type: "GET",
			url: "form_contact_process.php",
			cache: false,
			
			data: 'contact_email=' + Email +'&contact_name=' + Name +'&contact_message=' + Message+'&contact_phone=' + Phone+'&contact_website=' + Website + '&contact_captcha=' + Captcha,
			
			beforeSend: function() {
				$('#contact .confirm').hide().html('<p class="success left">Processing ...</p>').fadeIn();
			},
			success: function(html){
				$('#contact .confirm').hide().html(html).fadeIn().delay(2500).fadeOut();
				return false;
			},
			error : function() {
				$('#contact .confirm').hide().html('<img class="left" src="images/cross_icon.png"> <p class="error left">Message failed to be sent</p>').fadeIn().delay(1500).fadeOut();
				return false;
			}
		});
		return false;
	});
	//CONTACT US ENDS

	
})
/* SLIDER FUNCTION */
$(function() {
	function onAfter() {
		if ((jQuery.browser.msie)&&(jQuery.browser.version == 8)) {
			$('#address iframe').css('display','block');
			$('#address iframe').css('width','280px');
		}
	}
	function onBefore() {
		if ((jQuery.browser.msie)&&(jQuery.browser.version == 8)) {
			$('#address iframe').css('display','block');
			$('#address iframe').css('width','279px');
		}
	}
			$('#panel_slider').cycle({
				fx:      'turnDown',
				timeout:  0,
				pager: '#navigation #nav',
				after: onAfter,
				before: onBefore,
				end: onAfter,
				pagerAnchorBuilder: function(idx, slide) {
					return '#nav li:eq(' + (idx) + ') a';
				}
			}); 
});
/* SLIDER FUNCTION ENDS */

/* SLIDER PORTFOLIO FUNCTION */
$(function() {

			$('#portfolio .portfolio_n').cycle({
				fx:      'scrollHorz',
				timeout:  0,
				prev:    '#portfolio #portfolio_pager #prev',
				next:    '#portfolio #portfolio_pager #next'
			}); 
});
/* SLIDER PORTFOLIO  FUNCTION ENDS */



