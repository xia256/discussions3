export default {
    data: () => ({
        layout: {
            showLeft: true,
            leftCols: 4,
            middleRightCols: 8,
            showRight: true,
        }
    }),
    watch: {
        is4K() { this.recalculateLayout(); },
        isMDPI() { this.recalculateLayout(); },
        isMobile() { this.recalculateLayout(); },
    },
    computed: {
        layoutLeftStyle() {
            return this.isMDPI ? `` : `width: 205px`;
        },
        layoutMiddleStyle() {
            let middleWidthSize = '975px';
            if (this.isMobile) middleWidthSize = "100%";

            //This is modified to extend or reduce the width of the content displayed on posts.
            if (this.layout.showRight) middleWidthSize = "850px";

            return `min-width: ${middleWidthSize}; max-width: ${middleWidthSize};`;
        },
        layoutRightStyle() {
            return `width: 200px`;
        }
    },
    created() {
        this.recalculateLayout();
    },
    methods: {
        recalculateLayout() {
            const layout = this.layout;
            if (this.isMobile) {
                layout.showLeft = false;
                layout.middleRightCols = 12;
                layout.showRight = false;
            }
            else if (this.is4K) {
                layout.showLeft = true;
                layout.leftCols = 4;
                layout.middleRightCols = 8;
                layout.showRight = true;
            }
            else if (this.isMDPI) {
                layout.showLeft = true;
                layout.leftCols = 2;
                layout.middleRightCols = 10;
                layout.showRight = true;
            }
            else { // isHiDPI
                layout.showLeft = true;
                layout.leftCols = 3;
                layout.middleRightCols = 9;
                layout.showRight = true;
            }
        }
    }
};
