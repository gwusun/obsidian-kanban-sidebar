obsidian_plugin_home=/Users/sunwu/SW-KnowledgeBase/.obsidian/plugins/obsidian-kanban

debug:
	rm -rf ./dist/
	yarn release
	cp -R -f ./dist/ $(obsidian_plugin_home)

git_prepare:
	git init .
	git remote add origin git@github.com:gwusun/obsidian-kanban-sidebar.git

push: 
	git add .
	git commit -m "Update changes"
	git push   origin  master