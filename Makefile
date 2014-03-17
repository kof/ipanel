build:
	NODE_PATH=${PWD}/bower_components ./node_modules/browserify/bin/cmd.js -e ./index.js -o ./dist/ipanel.js -s iPanel
	NODE_PATH=${PWD}/bower_components ./node_modules/browserify/bin/cmd.js -e ./jquery.ipanel.js -o ./dist/jquery.ipanel.js -s
	./node_modules/.bin/uglifyjs < ./dist/ipanel.js > ./dist/ipanel.min.js --comments license
	./node_modules/.bin/uglifyjs < ./dist/jquery.ipanel.js > ./dist/jquery.ipanel.min.js --comments license
	xpkg .


.PHONY: build
