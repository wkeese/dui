define(function(){ return '\
/*\
 * This file is to test CSS --> JS conversion for:\
 *	- UTF-8 characters\
 *	- escape sequences for unicode characters\
 *	- single and double quotes\
 */\
.native::before {\
	content: "☑"	/* ballot box with check */\
}\
.encoded::before {\
	content: \'\\2611\'	/* ballot box with check */\
}'; } );
