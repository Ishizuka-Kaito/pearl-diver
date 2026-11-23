"""Timing, scoring and oxygen rules for one Pearl Diver voyage (Brython)."""

from browser import window

SURVEY_SECONDS = 10
DIVE_SECONDS = 30
OXYGEN = 13
BREATH_RATE = 1.3
SWIM_SPEED = 70
DASH_SPEED_FACTOR = 1.65
DASH_BREATH_FACTOR = 2.4

ui = window.PearlUI


class Voyage:
    def __init__(self):
        self.state = window.Object.new()
        self.state.plan = SURVEY_SECONDS
        self.state.air = OXYGEN
        self.state.capacity = OXYGEN
        self.state.warning = 4 * BREATH_RATE
        self.state.ended = False
        self.remaining = DIVE_SECONDS
        self.score = 0
        self.cargo = 0
        self.pearls = 0
        self.low_air = False
        self.scene = window.PearlScene.create(ui, self.state)
        self.show_hud()

    def show_hud(self):
        planning = self.state.plan > 0
        ui.hud(planning, self.state.plan if planning else self.remaining,
               self.score, self.cargo, self.state.air / BREATH_RATE,
               self.scene.isDashing())

    def refill(self):
        self.state.air = OXYGEN
        self.low_air = False

    def deliver(self):
        self.refill()
        if self.cargo:
            self.score += self.cargo
            self.scene.landed(self.cargo, self.pearls)
            ui.message(f"真珠を船に届けて {self.cargo} 点！")
            self.cargo = 0
            self.pearls = 0

    def swim(self, dt, elapsed):
        dash = self.scene.wantsDash()
        speed = SWIM_SPEED * (DASH_SPEED_FACTOR if dash else 1)
        distance = self.scene.swim(dt, speed)
        if self.scene.atBoat():
            self.deliver()
        else:
            # Charge the dash premium only for the distance actually swum.
            extra = distance / speed * (DASH_BREATH_FACTOR - 1) if dash else 0
            self.state.air = max(0, self.state.air - (elapsed + extra) * BREATH_RATE)

        for points in self.scene.takeBeds():
            self.pearls += 1
            self.cargo += points
            ui.message(f"真珠を拾った。船に届けると {self.cargo} 点。")
            ui.tone(640, 0.1)
        if self.state.air < OXYGEN - 0.5 and self.scene.useVent():
            self.refill()
            ui.message("泡だまりで空気が満タンになりました。")
            ui.tone(460, 0.13)
        if self.state.air <= 0:
            self.scene.rescue()
            ui.message("空気切れ。救助船が引き上げます。")
        elif self.state.air < self.state.warning and not self.low_air:
            self.low_air = True
            ui.message("残りの空気がわずか。泡だまりかロープへ！")
            ui.tone(230, 0.13)

    def update(self, dt, elapsed):
        if self.state.ended:
            return
        self.scene.stepBoat(dt)
        if self.state.plan > 0:
            spent = min(elapsed, self.state.plan)
            self.state.plan -= spent
            elapsed -= spent
            if self.state.plan < 1e-7:
                self.state.plan = 0
                ui.tone(660, 0.18)
                ui.message("← → で入口を選び、↓ または海中タップで潜ろう。")
            if elapsed <= 0:
                self.show_hud()
                return

        elapsed = min(elapsed, self.remaining)
        dt = min(dt, elapsed)
        self.remaining -= elapsed
        if self.scene.onRope():
            destination = self.scene.advanceLift(dt)
            if destination == "boat":
                ui.message("船で空気が満タンに。次の貝へ！")
                self.deliver()
            elif destination == "anchor":
                ui.message("設置点に到着。ここから泳げます。")
        elif not self.scene.onDeck():
            self.swim(dt, elapsed)

        self.show_hud()
        if self.remaining < 1e-7:
            self.state.ended = True
            ui.finish(self.score, self.cargo)


def start():
    voyage = Voyage()
    ui.play(voyage.scene, voyage.update)


ui.ready(start)
