ifeq ($(OS),Windows_NT)
  SHELL := powershell.exe
  DOCKER_USERNAME := $(DOCKER_USERNAME)
else
  UNAME_S := $(shell uname -s)
  ifeq ($(UNAME_S),Linux)
    SHELL := /bin/bash
    CURRENT_USER := $(shell echo $$USER)
  endif
  ifeq ($(UNAME_S),Darwin)
    SHELL = /usr/bin/env bash
    CURRENT_USER := $(shell id -un)
  endif
endif

ifneq ($(strip $(DOCKER_USERNAME)),)
  imageOwner := $(DOCKER_USERNAME)/
else
  imageOwner :=
endif

# build image
buildTargets := \
	desktop \
	providers/terminal \
	providers/adminer \
	providers/bytebase \
	providers/costcenter \
	providers/dbprovider \
	providers/applaunchpad
buildTargets-all := $(addprefix build-,$(buildTargets))
# Generate phony targets using foreach and eval.
$(foreach target,$(buildTargets),$(eval .PHONY: build-$($(target))))
$(foreach target,$(buildTargets),$(eval .PHONY: dev-$($(target))))
.PHONY: all dev-desktop prebuild

all: prebuild-image $(buildTargets-all)

fetch-deps: pnpm-lock.yaml
	pnpm fetch
build-packages: fetch-deps
	pnpm -r --offline --filter=./packages/* install
	pnpm -r --offline --filter=./packages/* build
dev-providers/%: build-packages
	pnpm -r --offline --filter=./providers/$* install
	pnpm -r --offline --filter=./providers/$* dev
dev-%: build-packages
	pnpm -r --offline --filter=$* install
	pnpm -r --offline --filter=$* dev
# prebuild-image-for -j
prebuild-image: pnpm-lock.yaml
	docker build --target deps . -t $(imageOwner)sealos-deps:dev

build-providers/%: prebuild-image
	docker build -t $(imageOwner)sealos-$*:dev --build-arg path=providers/$* --build-arg name=$* . 
build-%: prebuild-image
	docker build -t $(imageOwner)sealos-$*:dev --build-arg path=$* --build-arg name=$* . 
# Default target to run all builds.
