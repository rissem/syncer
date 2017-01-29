#! /bin/bash
#TODO will need a windows equivalent
ssh -o "ControlMaster auto" -o "ControlPath ~/.ssh/ssh_mux_%h_%p_%r" $*
