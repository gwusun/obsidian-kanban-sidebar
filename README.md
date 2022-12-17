# Obsidian Kanban Sidebar Plugin
A modified version of [obsidian-kanban](https://github.com/mgmeyers/obsidian-kanban)


# Why change this?
I need a task manager and a navigation on the left sidebar for the Obsidian, i.e., 
![](./imgs/HOME.png)

# Where code is modified by me?

Changed in `src/components/Lane/Lane.tsx`
```
    <div
      ref={measureRef}
      className={classcat([
        c('lane-wrapper'),
        {
          'is-sorting': isSorting,
        },
      ])}
      # remove style={laneStyles}
    >
```

Changed in `src/main.less`
``` 
.kanban-plugin {
  --lane-width: 100%;
}
```
